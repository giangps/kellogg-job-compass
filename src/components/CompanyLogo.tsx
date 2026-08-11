function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function CompanyLogo({
  name,
  logoUrl,
  sourceUrl,
  className = "size-10",
}: {
  name: string;
  logoUrl?: string | null;
  sourceUrl?: string | null;
  className?: string;
}) {
  const host = hostOf(sourceUrl);
  const src = logoUrl ?? (host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : null);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-xs font-semibold text-muted-foreground ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={`${name} logo`}
          className="size-full object-contain p-1"
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
