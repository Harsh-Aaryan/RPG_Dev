-- RepoRaid shared battles (Supabase Postgres). Idempotent: safe to run twice.
--
-- Trust model
--   * Browsers never write to these tables. Every mutation goes through a
--     Netlify Function using the server's database connection.
--   * HP lives in battles.max_hp/current_hp but is only ever *recomputed* from
--     verified quests, and only record_verified_hit / invalidate_hit change
--     quest verification. A duplicate verification cannot double-count.
--   * The browser's anon key may only SELECT battle_events (for Realtime).

create table if not exists battles (
  id text primary key,
  name text not null check (char_length(name) between 1 and 60),
  repository_id text not null,
  label text not null check (label in ('simulated', 'live')),
  scan jsonb not null,
  findings jsonb not null,            -- sanitized SafeFinding snapshot
  status text not null default 'active' check (status in ('forming', 'active', 'defeated')),
  max_hp int not null default 0,
  current_hp int not null default 0,
  created_at timestamptz not null default now(),
  defeated_at timestamptz
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  battle_id text not null references battles(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  xp int not null default 0,
  role text not null default 'player' check (role in ('host', 'player')),
  created_at timestamptz not null default now()
);
create index if not exists participants_battle_idx on participants(battle_id);

create table if not exists participant_secrets (
  participant_id uuid primary key references participants(id) on delete cascade,
  secret_hash text not null
);

create table if not exists quests (
  id text primary key,
  battle_id text not null references battles(id) on delete cascade,
  finding_id text not null,
  position int not null default 0,
  content jsonb not null,
  source text not null check (source in ('gemma', 'template')),
  model text,
  damage int not null check (damage > 0),
  status text not null default 'open'
    check (status in ('open', 'claimed', 'submitted', 'verifying', 'verified', 'rejected')),
  claimed_by uuid references participants(id) on delete set null,
  attempts int not null default 0,
  issue jsonb,
  receipt jsonb,
  verified_at timestamptz,
  unique (battle_id, finding_id)
);
create index if not exists quests_battle_idx on quests(battle_id, position);

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  quest_id text not null references quests(id) on delete cascade,
  participant_id uuid references participants(id) on delete set null,
  code_hash text,
  receipt jsonb,
  verification_state text not null check (verification_state in ('verified', 'invalidated')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
-- At most one live verified contribution per quest.
create unique index if not exists contributions_one_verified_per_quest
  on contributions(quest_id) where verification_state = 'verified';

create table if not exists battle_events (
  id bigint generated always as identity primary key,
  battle_id text not null references battles(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'join', 'claim', 'issue', 'attempt', 'hit', 'reopen', 'defeated')),
  quest_id text references quests(id) on delete set null,
  actor uuid references participants(id) on delete set null,
  damage int not null default 0,
  message text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists battle_events_battle_idx on battle_events(battle_id, id desc);

-- ---------------------------------------------------------------------------
-- Row level security: everything locked; the anon role may read events only.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['battles', 'participants', 'participant_secrets', 'quests', 'contributions', 'battle_events'] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon, authenticated', t);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on table battle_events to anon, authenticated;
  end if;
end $$;

drop policy if exists "battle events are public" on battle_events;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    create policy "battle events are public" on battle_events for select to anon, authenticated using (true);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'battle_events') then
    alter publication supabase_realtime add table battle_events;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- HP: derived from verified quests, never decremented by events.
-- ---------------------------------------------------------------------------
create or replace function recompute_battle(p_battle_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_max int; v_done int; v_cur int; v_status text;
begin
  select coalesce(sum(damage), 0), coalesce(sum(damage) filter (where status = 'verified'), 0)
    into v_max, v_done from quests where battle_id = p_battle_id;
  v_cur := greatest(v_max - v_done, 0);
  update battles set
    max_hp = v_max,
    current_hp = v_cur,
    status = case when v_max > 0 and v_cur = 0 then 'defeated' when v_max > 0 then 'active' else status end,
    defeated_at = case when v_max > 0 and v_cur = 0 then coalesce(defeated_at, now()) else null end
  where id = p_battle_id
  returning status into v_status;
  return jsonb_build_object('max_hp', v_max, 'current_hp', v_cur, 'status', v_status);
end $$;

-- Lock order everywhere: quest row, then battle row. This serializes hits per
-- battle, so two simultaneous verifications of one quest apply exactly once.
create or replace function record_verified_hit(p_quest_id text, p_participant_id uuid, p_receipt jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare q quests%rowtype; v_prev text; v_res jsonb; v_name text; v_event bigint; v_xp int;
begin
  select * into q from quests where id = p_quest_id for update;
  if not found then raise exception 'quest_not_found' using errcode = 'P0002'; end if;
  if q.status = 'verified' then
    return jsonb_build_object('applied', false, 'reason', 'already_verified');
  end if;
  select status into v_prev from battles where id = q.battle_id for update;

  insert into contributions (quest_id, participant_id, code_hash, receipt, verification_state, verified_at)
  values (q.id, p_participant_id, p_receipt->>'codeHash', p_receipt, 'verified', now());

  update quests set status = 'verified', verified_at = now(), receipt = p_receipt where id = q.id;

  v_xp := round(q.damage * 0.5);
  if p_participant_id is not null then
    update participants set xp = xp + v_xp where id = p_participant_id and battle_id = q.battle_id
    returning nickname into v_name;
  end if;

  insert into battle_events (battle_id, event_type, quest_id, actor, damage, message)
  values (q.battle_id, 'hit', q.id, p_participant_id, q.damage,
          coalesce(v_name, 'Someone') || ' landed a verified fix: −' || q.damage || ' HP')
  returning id into v_event;

  v_res := recompute_battle(q.battle_id);
  if v_res->>'status' = 'defeated' and v_prev is distinct from 'defeated' then
    insert into battle_events (battle_id, event_type, damage, message)
    values (q.battle_id, 'defeated', 0, 'The boss shatters! Every finding is verified fixed.');
  end if;
  return v_res || jsonb_build_object('applied', true, 'damage', q.damage, 'event_id', v_event);
end $$;

create or replace function invalidate_hit(p_quest_id text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q quests%rowtype; v_res jsonb;
begin
  select * into q from quests where id = p_quest_id for update;
  if not found then raise exception 'quest_not_found' using errcode = 'P0002'; end if;
  if q.status <> 'verified' then
    return jsonb_build_object('applied', false, 'reason', 'not_verified');
  end if;
  perform 1 from battles where id = q.battle_id for update;

  with inv as (
    update contributions set verification_state = 'invalidated'
    where quest_id = q.id and verification_state = 'verified'
    returning participant_id
  )
  update participants set xp = greatest(0, xp - round(q.damage * 0.5))
  where id in (select participant_id from inv);

  update quests set status = 'open', verified_at = null, receipt = null where id = q.id;

  insert into battle_events (battle_id, event_type, quest_id, damage, message)
  values (q.battle_id, 'reopen', q.id, q.damage,
          'Fix for “' || coalesce(q.content->>'questTitle', 'a quest') || '” was invalidated'
          || coalesce(' (' || nullif(trim(p_reason), '') || ')', '') || '; +' || q.damage || ' HP restored');

  v_res := recompute_battle(q.battle_id);
  return v_res || jsonb_build_object('applied', true);
end $$;

do $$
begin
  revoke all on function recompute_battle(text) from public;
  revoke all on function record_verified_hit(text, uuid, jsonb) from public;
  revoke all on function invalidate_hit(text, text) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function recompute_battle(text) from anon, authenticated;
    revoke all on function record_verified_hit(text, uuid, jsonb) from anon, authenticated;
    revoke all on function invalidate_hit(text, text) from anon, authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function recompute_battle(text) to service_role;
    grant execute on function record_verified_hit(text, uuid, jsonb) to service_role;
    grant execute on function invalidate_hit(text, text) to service_role;
  end if;
end $$;
