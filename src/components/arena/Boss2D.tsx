import { useMemo } from 'react';
import { SEVERITY_STYLE } from '../../lib/game-rules';
import type { Severity } from '../../lib/types';

type Props = {
  severity: Severity | null;
  form?: Severity | null;
  hpRatio: number;
  defeated: boolean;
  reducedMotion: boolean;
  className?: string;
};

type Pt = [number, number];

/** Centripetal-ish Catmull-Rom through 2D control points. */
function spline(points: Pt[], samples: number): Pt[] {
  const out: Pt[] = [];
  const n = points.length - 1;
  for (let s = 0; s <= samples; s++) {
    const u = (s / samples) * n;
    const i = Math.min(n - 1, Math.floor(u));
    const t = u - i;
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n, i + 2)];
    const t2 = t * t;
    const t3 = t2 * t;
    const f = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}

// Tail tip (front right) → front of the dais → around the left → behind → rising neck.
const SPINE: Pt[] = [
  [304, 262],
  [250, 270],
  [178, 268],
  [112, 256],
  [92, 236],
  [132, 220],
  [200, 216],
  [238, 200],
  [246, 160],
  [232, 120],
  [212, 92],
];

function radius(t: number): number {
  if (t < 0.45) return 3 + (t / 0.45) * 15;
  if (t < 0.68) return 18 + ((t - 0.45) / 0.23) * 7;
  return 25 - ((t - 0.68) / 0.32) * 12;
}

const ELLIPSE = Array.from({ length: 12 }, (_, k) => {
  const a = (k / 12) * Math.PI * 2;
  return [200 + 150 * Math.cos(a), 246 + 32 * Math.sin(a)] as Pt;
});

const EMBERS = Array.from({ length: 16 }, (_, i) => ({
  x: 70 + ((i * 97) % 260),
  y: 70 + ((i * 53) % 160),
  r: 0.8 + (i % 3) * 0.5,
  d: 5 + (i % 5),
  delay: -(i * 0.7),
}));

const pts = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * Hand-faceted 2D Rootkit Wyrm. Shown when WebGL is unavailable, when the URL
 * has ?2d=1, and as the poster while the 3D arena chunk is loading.
 */
export function Boss2D({ severity, form, hpRatio, defeated, reducedMotion, className = '' }: Props) {
  const accent = severity ? SEVERITY_STYLE[severity].color : '#82a58a';
  const shape = form === undefined ? severity : form;
  const winged = shape === 'critical' || shape === null;

  const body = useMemo(() => {
    const line = spline(SPINE, 64);
    const segs: { top: Pt[]; belly: Pt[]; spine?: Pt[]; t: number }[] = [];
    for (let i = 0; i < line.length - 1; i++) {
      const t = i / (line.length - 1);
      const [x0, y0] = line[i];
      const [x1, y1] = line[i + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      // Normal that points "up" on screen (the dorsal side).
      let nx = dy / len;
      let ny = -dx / len;
      if (ny > 0) {
        nx = -nx;
        ny = -ny;
      }
      const r0 = radius(t);
      const r1 = radius((i + 1) / (line.length - 1));
      const up0: Pt = [x0 + nx * r0, y0 + ny * r0];
      const up1: Pt = [x1 + nx * r1, y1 + ny * r1];
      const dn0: Pt = [x0 - nx * r0 * 0.9, y0 - ny * r0 * 0.9];
      const dn1: Pt = [x1 - nx * r1 * 0.9, y1 - ny * r1 * 0.9];
      const seg: (typeof segs)[number] = { top: [up0, up1, [x1, y1], [x0, y0]], belly: [[x0, y0], [x1, y1], dn1, dn0], t };
      if (i % 3 === 0 && t > 0.18 && t < 0.92) {
        const h = 6 + r0 * 0.55;
        seg.spine = [up0, [up0[0] + nx * h - dx * 0.4, up0[1] + ny * h - dy * 0.4], up1];
      }
      segs.push(seg);
    }
    return { segs: segs.reverse(), line };
  }, []);

  const core = body.line[Math.round(body.line.length * 0.7)];
  const coreGlow = defeated ? 0 : 0.35 + hpRatio * 0.65;
  const animate = !reducedMotion && !defeated;

  return (
    <svg
      viewBox="0 0 400 300"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label={defeated ? 'The defeated boss lies shattered on the arena dais' : 'The repository boss coiled on a stone arena dais'}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="b2d-glow" cx="0.52" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#c99460" stopOpacity="0.16" />
          <stop offset="1" stopColor="#c99460" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="b2d-core">
          <stop offset="0" stopColor="#ffe0b8" />
          <stop offset="0.45" stopColor={accent} />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="b2d-membrane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e2420" />
          <stop offset="1" stopColor="#1c1714" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill="url(#b2d-glow)" />

      {/* broken pillars */}
      <polygon points="58,228 58,128 70,118 84,126 86,228" fill="#222a25" />
      <polygon points="70,118 84,126 86,228 76,228" fill="#29332c" />
      <polygon points="318,228 318,150 330,140 336,152 346,146 346,228" fill="#222a25" />
      <polygon points="336,152 346,146 346,228 338,228" fill="#29332c" />
      <rect x="56" y="170" width="32" height="5" fill="#6b4d31" opacity="0.8" />

      {/* dais */}
      <polygon points={pts(ELLIPSE)} fill="#3a413a" />
      {ELLIPSE.slice(0, 7).map((p, i) => {
        if (i === 6) return null;
        const q = ELLIPSE[i + 1];
        return (
          <polygon
            key={i}
            points={pts([p, q, [q[0], q[1] + 20], [p[0], p[1] + 20]])}
            fill={i % 2 ? '#262d28' : '#2c342e'}
          />
        );
      })}
      <polygon points={pts(ELLIPSE.slice(6).concat([ELLIPSE[0]]).concat([[200, 246]]))} fill="#333a33" opacity="0.6" />
      <ellipse cx="200" cy="246" rx="98" ry="20" fill="none" stroke="#c99460" strokeOpacity="0.45" strokeWidth="1.2" />
      <ellipse cx="200" cy="246" rx="64" ry="13" fill="none" stroke="#c99460" strokeOpacity="0.3" strokeDasharray="3 5" />

      {/* wings */}
      {winged && !defeated && (
        <g>
          <polygon
            points="236,170 152,96 58,46 84,92 40,100 82,130 60,152 112,160 120,184 206,196"
            fill="url(#b2d-membrane)"
            stroke="#3a2c24"
            strokeWidth="1"
          />
          <polyline points="236,170 152,96 58,46" fill="none" stroke="#7a5a3c" strokeWidth="3" strokeLinejoin="round" />
          <path d="M152 96 40 100M152 96 60 152M152 96 120 184" fill="none" stroke="#6b4d33" strokeWidth="2" />
          <polygon
            points="250,172 302,98 362,58 352,96 384,110 350,134 366,160 318,166 300,190 256,198"
            fill="url(#b2d-membrane)"
            stroke="#3a2c24"
            strokeWidth="1"
            opacity="0.92"
          />
          <polyline points="250,172 302,98 362,58" fill="none" stroke="#7a5a3c" strokeWidth="3" strokeLinejoin="round" />
          <path d="M302 98 384 110M302 98 366 160M302 98 300 190" fill="none" stroke="#6b4d33" strokeWidth="2" />
        </g>
      )}

      {/* body */}
      <g opacity={defeated ? 0 : 1}>
        {body.segs.map((s, i) => (
          <g key={i}>
            {s.spine && <polygon points={pts(s.spine)} fill="#6e5236" />}
            <polygon points={pts(s.top)} fill={i % 2 ? '#1f2823' : '#27312b'} />
            <polygon points={pts(s.belly)} fill={i % 2 ? '#51493a' : '#5d5442'} />
          </g>
        ))}
        {/* chest plates */}
        {[0.6, 0.66, 0.72].map((t) => {
          const [x, y] = body.line[Math.round(body.line.length * t)];
          return <polygon key={t} points={`${x - 9},${y} ${x},${y - 6} ${x + 9},${y} ${x},${y + 7}`} fill="#8e643f" stroke="#b78150" strokeWidth="0.6" />;
        })}
      </g>

      {/* core */}
      {!defeated && (
        <g opacity={coreGlow}>
          <circle cx={core[0]} cy={core[1]} r="18" fill="url(#b2d-core)" opacity="0.55">
            {animate && <animate attributeName="opacity" values="0.35;0.65;0.35" dur="3.2s" repeatCount="indefinite" />}
          </circle>
          <polygon points={`${core[0]},${core[1] - 6} ${core[0] + 4},${core[1]} ${core[0]},${core[1] + 6} ${core[0] - 4},${core[1]}`} fill="#ffd1a1" />
        </g>
      )}

      {/* head */}
      <g transform="translate(206 80)" opacity={defeated ? 0 : 1}>
        <polygon points="8,-16 46,-46 26,-12" fill="#c9bb9c" />
        <polygon points="8,-16 46,-46 30,-20" fill="#a99a7d" />
        <polygon points="14,-8 54,-24 24,-2" fill="#b3a587" />
        <polygon points="-18,-12 6,-21 23,-8 20,8 2,15 -14,8" fill="#29332c" />
        <polygon points="-18,-12 6,-21 8,-6 -6,0" fill="#323d35" />
        <polygon points="-14,-6 -48,4 -52,12 -36,17 -12,12" fill="#222b25" />
        <polygon points="-14,-6 -48,4 -30,6" fill="#2d3830" />
        <polygon points={defeated ? '-10,12 -44,16 -46,20 -30,22 4,16' : '-10,13 -42,22 -45,28 -30,28 4,17'} fill="#1b221e" />
        <polygon points="-38,16 -35,22 -32,16" fill="#d8ccb2" />
        <polygon points="-28,15 -25,21 -22,15" fill="#d8ccb2" />
        <polygon points="-22,-9 -2,-15 0,-9 -17,-4" fill="#3c473f" />
        <polygon points="-15,-5 -6,-8 -8,-3" fill={defeated ? '#3a3a36' : '#ff8a52'}>
          {animate && <animate attributeName="opacity" values="0.75;1;0.75" dur="2.4s" repeatCount="indefinite" />}
        </polygon>
      </g>

      {/* drifting embers */}
      {!defeated &&
        EMBERS.map((e, i) => (
          <circle key={i} cx={e.x} cy={e.y} r={e.r} fill={i % 3 ? '#d0a260' : '#c66a5e'} opacity="0.7">
            {animate && (
              <>
                <animate attributeName="cy" values={`${e.y + 30};${e.y - 40}`} dur={`${e.d}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;0.8;0" dur={`${e.d}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
              </>
            )}
          </circle>
        ))}

      {/* shards when defeated */}
      {defeated &&
        Array.from({ length: 26 }, (_, i) => {
          const x = 96 + ((i * 71) % 210);
          const y = 228 + ((i * 29) % 34);
          return <polygon key={i} points={`${x},${y} ${x + 7},${y - 5} ${x + 4},${y + 4}`} fill={i % 3 ? '#2b352e' : '#8e643f'} />;
        })}
    </svg>
  );
}
