/** Forged corner brackets that frame the arena and other focal panels. */
export function CornerBrackets({ className = '', inset = 8 }: { className?: string; inset?: number }) {
  const corner = 'absolute h-4 w-4 border-copper/70';
  return (
    <span className={`pointer-events-none absolute inset-0 z-10 ${className}`} aria-hidden>
      <span className={`${corner} border-l border-t`} style={{ left: inset, top: inset }} />
      <span className={`${corner} border-r border-t`} style={{ right: inset, top: inset }} />
      <span className={`${corner} border-b border-l`} style={{ left: inset, bottom: inset }} />
      <span className={`${corner} border-b border-r`} style={{ right: inset, bottom: inset }} />
    </span>
  );
}

/** Thin rule with a lozenge at its centre. */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-line ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M5 0.8 9.2 5 5 9.2 0.8 5Z" fill="none" stroke="#8a5f38" strokeWidth="1" />
        <path d="M5 3.2 6.8 5 5 6.8 3.2 5Z" fill="#c99460" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
    </div>
  );
}
