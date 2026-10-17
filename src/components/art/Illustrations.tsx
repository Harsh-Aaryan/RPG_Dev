/** Empty state: a quiet dais with a cold brazier, waiting for its first raid. */
export function EmptyDais({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden focusable="false">
      <ellipse cx="80" cy="66" rx="62" ry="14" fill="#202923" />
      <path d="M18 66v8c0 7.7 27.8 14 62 14s62-6.3 62-14v-8c0 7.7-27.8 14-62 14s-62-6.3-62-14Z" fill="#181f1b" />
      <ellipse cx="80" cy="66" rx="40" ry="8.5" fill="none" stroke="#8a5f38" strokeOpacity="0.55" strokeDasharray="2 4" />
      <path d="M80 50 88 58 80 66 72 58Z" fill="none" stroke="#415044" strokeWidth="1.2" />
      {/* cold brazier */}
      <path d="M124 64 128 46M132 64 128 46M128 64V46" stroke="#5a4632" strokeWidth="1.4" />
      <path d="M120 44h16l-3 5h-10Z" fill="#6b4d31" />
      <path d="M126 42c1-3 3-4 2-7 2 2 3 4 1 7Z" fill="#415044" />
      {/* broken pillar */}
      <path d="M28 64V30l5-4 3 5 3-2v35Z" fill="#232c26" />
      <path d="M36 31l3-2v35h-3Z" fill="#2c3630" />
    </svg>
  );
}

/** Victory crest: a shield struck by crossed blades, ringed by a laurel. */
export function VictoryCrest({ className = '' }: { className?: string }) {
  // Leaves run up each side of the shield along an arc, long axis on the tangent.
  const leaves = Array.from({ length: 8 }, (_, i) => {
    const deg = 112 + i * 16;
    const a = (deg * Math.PI) / 180;
    const r = 45 + (i % 2 ? 3 : -2);
    return { x: 60 + Math.cos(a) * r, y: 64 + Math.sin(a) * r, rot: deg + (i % 2 ? 22 : -22), scale: 1 - i * 0.05 };
  });
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Victory crest" focusable="false">
      {[1, -1].map((s) => (
        <g key={s} transform={s === -1 ? 'translate(120 0) scale(-1 1)' : undefined}>
          <path d="M43 104C26 96 15 81 15 62" fill="none" stroke="#5e7f64" strokeWidth="1.4" />
          {leaves.map((l, i) => (
            <ellipse
              key={i}
              cx={l.x}
              cy={l.y}
              rx={2.6 * l.scale}
              ry={7 * l.scale}
              transform={`rotate(${l.rot} ${l.x} ${l.y})`}
              fill={i % 2 ? '#82a58a' : '#6d8f75'}
            />
          ))}
        </g>
      ))}
      {/* crossed blades */}
      {[-1, 1].map((s) => (
        <g key={`b${s}`} transform={`translate(60 60) rotate(${s * 38})`}>
          <path d="M-2.4 -46h4.8v58l-2.4 6-2.4-6Z" fill="#ede7d9" />
          <path d="M0 -46v64" stroke="#afb7ab" strokeWidth="0.7" />
          <rect x="-11" y="-49" width="22" height="3.4" fill="#c99460" />
          <rect x="-2" y="-58" width="4" height="9" fill="#8a5f38" />
          <circle cy="-60" r="3" fill="#c99460" />
        </g>
      ))}
      <path d="M60 30 84 38v18c0 14-10.4 24.6-24 30-13.6-5.4-24-16-24-30V38Z" fill="#181f1b" stroke="#c99460" strokeWidth="2.2" />
      <path d="M60 36 78 42v14c0 10.6-7.8 18.8-18 23.2C49.8 74.8 42 66.6 42 56V42Z" fill="none" stroke="#8a5f38" strokeWidth="0.9" />
      <path d="m50 56 7 7 13-14" fill="none" stroke="#82a58a" strokeWidth="4" strokeLinecap="square" />
    </svg>
  );
}
