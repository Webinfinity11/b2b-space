"use client";

/* eslint-disable @next/next/no-img-element -- company logos from /files */
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ka } from "@/i18n/ka";
import { Icon } from "./Icon";

type Row = { href: string; title: string; sub: string; logoUrl?: string | null };
type Group = { title: string; rows: Row[] };

/** Header magnifier: opens a search box on the current page and filters as you type. */
export function SearchDialog({ admin = false, className = "" }: { admin?: boolean; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ q: string; groups: Group[] } | null>(null);
  const [active, setActive] = useState(0);
  const term = q.trim();

  const close = () => {
    setOpen(false);
    setQ("");
    setResult(null);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- close after navigating
  useEffect(() => close(), [pathname]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/quick-search?q=${encodeURIComponent(term)}${admin ? "&scope=admin" : ""}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { groups: Group[] }) => {
          setResult({ q: term, groups: d.groups });
          setActive(0);
        })
        .catch(() => {});
    }, term ? 180 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [open, term, admin]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const rows = result?.groups.flatMap((g) => g.rows) ?? [];
  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={ka.search.pageTitle} className={`grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-chip ${className}`}>
        <Icon name="search" size={20} />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 sm:pt-[10vh]" role="dialog" aria-modal="true" aria-label={ka.search.pageTitle}>
            <button type="button" aria-label={ka.sgba.close} onClick={close} className="absolute inset-0 bg-[rgb(11_18_37/0.45)] backdrop-blur-sm" />
            <div className="relative flex max-h-[80dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-2xl">
              <form
                role="search"
                className="flex items-center gap-3 border-b border-line px-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (rows[active]) go(rows[active].href);
                }}
              >
                <Icon name="search" size={18} />
                <input
                  autoFocus
                  style={{ outline: "none" }}
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((a) => Math.min(rows.length - 1, a + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((a) => Math.max(0, a - 1));
                    }
                  }}
                  autoComplete="off"
                  placeholder={admin ? ka.search.adminPlaceholder : ka.search.quickPlaceholder}
                  aria-label={ka.search.pageTitle}
                  className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none"
                />
                <button type="button" onClick={close} aria-label={ka.sgba.close} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-chip hover:text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
                </button>
              </form>
              <div className="overflow-y-auto p-2">
                {!result ? (
                  <p className="px-3 py-4 text-sm text-muted">{ka.search.loading}</p>
                ) : rows.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted">{result.q === term ? ka.search.none : ka.search.loading}</p>
                ) : (
                  result.groups.map((g) => (
                    <div key={g.title}>
                      <div className="px-3 pb-1 pt-2 text-[11px] font-bold text-muted">{g.title}</div>
                      {g.rows.map((row) => (
                        <button key={row.href} type="button" onClick={() => go(row.href)} className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left hover:bg-surface-2 ${rows[active] === row ? "bg-surface-2" : ""}`}>
                          <span className="grid h-10 w-[52px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line bg-white p-1">
                            {row.logoUrl ? <img src={row.logoUrl} alt="" className="h-full min-h-0 w-full object-contain" /> : <span className="text-xs font-extrabold text-[#1d45d1]">{row.title.slice(0, 2)}</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{row.title}</span>
                            <span className="block truncate text-xs text-muted">{row.sub}</span>
                          </span>
                          <Icon name="arrow" size={14} />
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
