/** Muted heraldic tinctures for player crests (deterministic per nickname). */
const TINCTURES = [
  { field: '#3a4a3f', charge: '#82a58a' },
  { field: '#4a3b2e', charge: '#c99460' },
  { field: '#3b4250', charge: '#9fb0c4' },
  { field: '#4c3532', charge: '#c66a5e' },
  { field: '#454530', charge: '#d0a260' },
  { field: '#36454a', charge: '#8fb3b0' },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Small shield-shaped avatar frame with an initial and a per-player division. */
export function AvatarCrest({ name, host = false, size = 36 }: { name: string; host?: boolean; size?: number }) {
  const h = hash(name || '?');
  const t = TINCTURES[h % TINCTURES.length];
  const division = (h >> 3) % 3; // 0 plain, 1 per bend, 2 chief
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const id = `crest-${h.toString(36)}`;
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 36 40" aria-hidden focusable="false" className="shrink-0">
      <defs>
        <clipPath id={id}>
          <path d="M18 2 33 6.5v11.5c0 9.3-6.6 16.2-15 19.8C9.6 34.2 3 27.3 3 18V6.5Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="36" height="40" fill={t.field} />
        {division === 1 && <path d="M0 6 36 34V40H28L0 14Z" fill={t.charge} opacity="0.22" />}
        {division === 2 && <rect width="36" height="11" fill={t.charge} opacity="0.2" />}
        <rect width="36" height="40" fill="url(#crest-sheen)" />
      </g>
      <path
        d="M18 2 33 6.5v11.5c0 9.3-6.6 16.2-15 19.8C9.6 34.2 3 27.3 3 18V6.5Z"
        fill="none"
        stroke={host ? '#c99460' : '#5b6b5e'}
        strokeWidth={host ? 1.8 : 1.3}
      />
      <text
        x="18"
        y="25"
        textAnchor="middle"
        fontFamily="Grenze, Georgia, serif"
        fontWeight="700"
        fontSize="17"
        fill="#ede7d9"
      >
        {initial}
      </text>
      {host && <path d="m12.5 1.2 2.2 2.6L18 0.6l3.3 3.2 2.2-2.6v3.4h-11Z" fill="#c99460" />}
    </svg>
  );
}

/** Shared gradient used by crests; render once near the app root. */
export function CrestDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id="crest-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
    </svg>
  );
}
