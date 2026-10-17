-- RepoRaid initial schema (next step after the local-first MVP).
-- Browser clients get read-only access to sanitized data; every mutation that
-- awards damage goes through trusted server code using the service-role key.

create table repositories (
  id text primary key,
  github_full_name text not null unique,
  owner_id uuid,
  authorized boolean not null default false,
  created_at timestamptz not null default now()
);

create table scans (
  id text primary key,
  repository_id text not null references repositories(id),
  commit_sha text not null,
  run_name text,
  source text not null,                       -- 'strix' | 'mock_strix.py'
  label text not null check (label in ('simulated', 'live')),
  status text not null default 'completed',
  complete boolean not null default false,
  finished_at timestamptz
);

create table findings (
  id text primary key,                        -- fingerprint(repo, commit, source id)
  scan_id text not null references scans(id),
  rule_id text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  cwe text,
  title text not null,
  safe_summary text not null,
  remediation_summary text not null,
  affected_path text,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'approved', 'in_progress', 'verified'))
);

create table battles (
  id text primary key,
  repository_id text not null references repositories(id),
  name text not null,
  status text not null default 'forming' check (status in ('forming', 'active', 'defeated')),
  max_hp integer not null,
  created_at timestamptz not null default now(),
  defeated_at timestamptz
);

create table quests (
  id text primary key,
  battle_id text not null references battles(id) on delete cascade,
  finding_id text not null references findings(id),
  content jsonb not null,                     -- validated QuestContent
  source text not null check (source in ('gemma', 'template')),
  damage integer not null,
  status text not null default 'open'
    check (status in ('open', 'claimed', 'submitted', 'verifying', 'verified', 'rejected')),
  issue_number integer,
  issue_url text,
  unique (battle_id, finding_id)
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  battle_id text not null references battles(id) on delete cascade,
  nickname text not null check (char_length(nickname) <= 24),
  xp integer not null default 0,
  role text not null default 'player' check (role in ('host', 'player'))
);

create table contributions (
  id uuid primary key default gen_random_uuid(),
  quest_id text not null references quests(id) on delete cascade,
  participant_id uuid references participants(id),
  pr_url text,
  code_hash text,
  verification_state text not null default 'pending'
    check (verification_state in ('pending', 'passed', 'failed', 'invalidated')),
  receipt_signature text,
  verified_at timestamptz
);
-- At most one live verified contribution per quest: duplicates can't double-count.
create unique index one_verified_fix_per_quest on contributions (quest_id) where verification_state = 'passed';

create table battle_events (
  id uuid primary key default gen_random_uuid(),
  battle_id text not null references battles(id) on delete cascade,
  event_type text not null,
  quest_id text references quests(id),
  damage integer,
  text text not null,
  created_at timestamptz not null default now()
);

-- HP is derived, never stored as a mutable counter.
create view battle_hp as
select b.id as battle_id,
       b.max_hp,
       b.max_hp - coalesce(sum(q.damage) filter (where q.status = 'verified'), 0) as current_hp
from battles b
left join quests q on q.battle_id = b.id
group by b.id;

alter table repositories enable row level security;
alter table scans enable row level security;
alter table findings enable row level security;
alter table battles enable row level security;
alter table quests enable row level security;
alter table participants enable row level security;
alter table contributions enable row level security;
alter table battle_events enable row level security;

-- Public read of sanitized game data only; no client write policies are defined.
create policy "read battles" on battles for select using (true);
create policy "read quests" on quests for select using (true);
create policy "read participants" on participants for select using (true);
create policy "read events" on battle_events for select using (true);
create policy "read approved findings" on findings for select using (status <> 'needs_review');

alter publication supabase_realtime add table battle_events, quests, participants;
