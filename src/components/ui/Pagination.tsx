import Link from "next/link";
import { ka } from "@/i18n/ka";

/** Server pagination that preserves current query params. */
export function Pagination({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const cls = "inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-sm hover:border-accent/40";
  return (
    <nav className="mt-8 flex items-center justify-between gap-3" aria-label={ka.catalog.page(page, pages)}>
      {page > 1 ? <Link className={cls} href={href(page - 1)}>← {ka.catalog.prev}</Link> : <span />}
      <span className="text-sm text-muted">{ka.catalog.page(page, pages)}</span>
      {page < pages ? <Link className={cls} href={href(page + 1)}>{ka.catalog.next} →</Link> : <span />}
    </nav>
  );
}
