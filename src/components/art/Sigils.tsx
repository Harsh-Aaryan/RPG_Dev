import type { Severity } from '../../lib/types';

/**
 * Custom game glyphs on a 16-unit grid. Stroke-drawn so they sit comfortably
 * next to lucide UI icons while reading as RepoRaid's own iconography.
 */

type GlyphProps = { size?: number; className?: string; title?: string };

function Glyph({ size = 16, className = '', title, children }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Horned skull, flame, fracture and feather: one silhouette per threat tier. */
export function SeveritySigil({ severity, ...p }: GlyphProps & { severity: Severity }) {
  switch (severity) {
    case 'critical':
      return (
        <Glyph {...p}>
          <path d="M3 2.2 5.4 6M13 2.2 10.6 6" />
          <path d="M4.4 8.2C4.4 5.4 6 4.2 8 4.2s3.6 1.2 3.6 4v1.6l-1.3 1v2.4H5.7v-2.4l-1.3-1Z" />
          <path d="m6.4 7.7.9.8-.9.8-.8-.8ZM9.6 7.7l.8.8-.8.8-.9-.8Z" fill="currentColor" stroke="none" />
          <path d="M7.2 11.4v1.8M8.8 11.4v1.8" strokeWidth="1" />
        </Glyph>
      );
    case 'high':
      return (
        <Glyph {...p}>
          <path d="M8 1.6c2.6 2.9 4.5 5.2 4.5 8a4.5 4.5 0 0 1-9 0c0-1.8.9-3.1 2-4 .2 1.3.8 2.1 1.6 2.4C6.7 6 7.1 3.8 8 1.6Z" />
          <path d="M8 9.4c.9.9 1.4 1.6 1.4 2.4a1.4 1.4 0 0 1-2.8 0c0-.8.5-1.5 1.4-2.4Z" strokeWidth="1" />
        </Glyph>
      );
    case 'medium':
      return (
        <Glyph {...p}>
          <path d="M9.6 1.6 4.6 9h3.5l-1.6 5.4 5-7.4H8Z" />
        </Glyph>
      );
    case 'low':
      return (
        <Glyph {...p}>
          <path d="M12.8 2.2C7.6 2.6 4.2 6.4 3.6 12.6c5.4-.5 9-4.2 9.2-10.4Z" />
          <path d="M3.6 12.6 9.4 6.6M6 10.2l2.4.2M7.6 8.4l2 .2" strokeWidth="1" />
        </Glyph>
      );
  }
}

/** Threat tier as filled notches: a second, colour-independent severity cue. */
export function ThreatPips({ severity, className = '' }: { severity: Severity; className?: string }) {
  const n = { critical: 4, high: 3, medium: 2, low: 1 }[severity];
  return (
    <span className={`inline-flex items-end gap-[2px] ${className}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`block w-[3px] ${i < n ? 'bg-current' : 'bg-current opacity-20'}`}
          style={{ height: 5 + i * 2 }}
        />
      ))}
    </span>
  );
}

export function SwordGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M13.8 2.2 6.6 9.4M13.8 2.2l-.4 2.6-6 6M13.8 2.2l-2.6.4" />
      <path d="m4.4 8.6 3 3M5.4 10.6 2.4 13.6" />
      <circle cx="2.2" cy="13.8" r=".6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function XpGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M8 1.8 9.5 6.5 14.2 8 9.5 9.5 8 14.2 6.5 9.5 1.8 8l4.7-1.5Z" />
    </Glyph>
  );
}

export function ShieldGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M8 1.6 13.4 3.4v4c0 3.3-2.3 5.6-5.4 6.9-3.1-1.3-5.4-3.6-5.4-6.9v-4Z" />
      <path d="m5.6 7.9 1.7 1.7 3.2-3.4" />
    </Glyph>
  );
}

export function ScrollGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M4.2 2.6h7.6c.9 0 1.6.7 1.6 1.6v.6h-2.2" />
      <path d="M11.2 4.2v8.2c0 .9-.7 1.6-1.6 1.6H3.4c-.9 0-1.6-.7-1.6-1.6v-.8h7.6" />
      <path d="M4.2 2.6c-.9 0-1.6.7-1.6 1.6v7.4M5.4 6.2h3.6M5.4 8.6h3.6" />
    </Glyph>
  );
}

/** Wax seal stamped on verified quests. */
export function Seal({ size = 44, className = '' }: { size?: number; className?: string }) {
  const teeth = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 19.5 : 21.5;
    return `${22 + Math.cos(a) * r},${22 + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className={className} role="img" aria-label="Verified seal" focusable="false">
      <polygon points={teeth} fill="#4d6852" />
      <circle cx="22" cy="22" r="16" fill="#5e7f64" stroke="#82a58a" strokeWidth="1" />
      <circle cx="22" cy="22" r="12.5" fill="none" stroke="#a9c4ad" strokeWidth="0.8" strokeDasharray="1.6 1.6" />
      <path d="m15.8 22.4 4.1 4 8.3-8.6" fill="none" stroke="#ede7d9" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  );
}
