/** A turning lozenge — the loading mark used on buttons and panels. */
export function Spinner({ size = 14, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className="shrink-0 animate-spin [animation-duration:1.1s]"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.6" />
      <path d="M8 1.5 14.5 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}
