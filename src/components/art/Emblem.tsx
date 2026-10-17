/**
 * RepoRaid insignia: a heater shield bearing a downward blade between code
 * brackets. Drawn on a 32-unit grid so it stays crisp from 16px to hero size.
 */
export function Emblem({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path
        d="M16 1.8 28.2 5.9v9.2c0 7.2-5.3 12.6-12.2 15.1C9.1 27.7 3.8 22.3 3.8 15.1V5.9Z"
        fill="#181f1b"
        stroke="#c99460"
        strokeWidth="1.6"
        strokeLinejoin="miter"
      />
      <path d="M16 4.6 25.6 7.8v7.3c0 5.7-4.1 10-9.6 12.2-5.5-2.2-9.6-6.5-9.6-12.2V7.8Z" fill="none" stroke="#8a5f38" strokeWidth="0.7" />
      {/* blade */}
      <circle cx="16" cy="7.6" r="1.25" fill="#c99460" />
      <rect x="15.25" y="8.6" width="1.5" height="2.4" fill="#8a5f38" />
      <path d="M11.6 11h8.8l-.9 1.3h-7Z" fill="#c99460" />
      <path d="M15.05 12.3h1.9v9.9L16 25.4l-.95-3.2Z" fill="#ede7d9" />
      <path d="M16 12.3v13.1" stroke="#afb7ab" strokeWidth="0.35" />
      {/* brackets */}
      <path d="M10.6 13.6 7.4 17.2l3.2 3.6M21.4 13.6l3.2 3.6-3.2 3.6" fill="none" stroke="#afb7ab" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Emblem size={30} />
      <span className="font-display text-[1.4rem] font-semibold leading-none tracking-[0.01em] text-ink">
        RepoRaid
      </span>
    </span>
  );
}
