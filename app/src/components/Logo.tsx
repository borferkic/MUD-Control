// Logo B: un monitor con tres usuarios. Toma el color --logo del tema.
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true"
      style={{ filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--logo) 70%, transparent))', fill: 'var(--logo)' }}>
      <rect x="8" y="12" width="80" height="56" rx="8" fill="none" stroke="var(--logo)" strokeWidth="7" />
      <circle cx="30" cy="34" r="6" /><path d="M20 54a10 10 0 0 1 20 0z" />
      <circle cx="48" cy="34" r="6" /><path d="M38 54a10 10 0 0 1 20 0z" />
      <circle cx="66" cy="34" r="6" /><path d="M56 54a10 10 0 0 1 20 0z" />
      <rect x="40" y="68" width="16" height="10" /><rect x="30" y="78" width="36" height="6" rx="3" />
    </svg>
  )
}
