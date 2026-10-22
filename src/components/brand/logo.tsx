export function Logo({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
        <circle cx="12" cy="5" r="3.5" className="fill-primary" />
        <circle cx="5" cy="12" r="3.5" className="fill-ink" />
        <circle cx="19" cy="12" r="3.5" className="fill-ink" />
        <circle cx="12" cy="19" r="3.5" className="fill-success" />
      </svg>
      <span className={`text-lg font-semibold tracking-tight ${compactOnMobile ? "hidden sm:inline" : ""}`}>
        Project Study
      </span>
    </span>
  );
}
