"use client";

/* eslint-disable @next/next/no-img-element -- company logos from /files */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ka } from "@/i18n/ka";
import { Icon } from "./Icon";

type Result = {
  companies: { slug: string; name: string; city: string | null; logoUrl: string | null; verified: boolean }[];
  offers: { id: string; title: string; type: "OFFER" | "REQUEST"; category: string | null; price: string }[];
  categories: { slug: string; name: string; parent: string | null }[];
};
type Item = { href: string; key: string };

/** Header search with live suggestions (companies, offers, categories). "/" focuses, arrows navigate, Enter opens. */
export function HeaderSearch({ defaultValue = "", placeholder = ka.search.placeholder }: { defaultValue?: string; placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const term = q.trim();

  // Debounced fetch of suggestions
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: Result) => {
          setData(d);
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // "/" focuses the search, click outside closes the panel
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const click = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", click);
    };
  }, []);

  const shown = term.length >= 2 ? data : null;
  const items: Item[] = shown
    ? [
        ...shown.companies.map((c) => ({ href: `/companies/${c.slug}`, key: `c-${c.slug}` })),
        ...shown.offers.map((o) => ({ href: `/offers/${o.id}`, key: `o-${o.id}` })),
        ...shown.categories.map((c) => ({ href: `/categories/${c.slug}`, key: `k-${c.slug}` })),
      ]
    : [];
  const allHref = `/search?q=${encodeURIComponent(term)}`;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const isActive = (key: string) => items.findIndex((i) => i.key === key) === active;
  const rowCls = (key: string) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${isActive(key) ? "bg-accent/10" : "hover:bg-accent/[0.06]"}`;

  return (
    <div ref={box} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && items[active]) go(items[active].href);
          else if (term) go(allHref);
        }}
      >
        <label className="flex h-10 w-72 items-center gap-2 rounded-[10px] border border-line bg-field px-3 text-muted focus-within:border-accent/50 xl:w-80">
          <Icon name="search" size={16} />
          <input
            ref={input}
            name="q"
            type="search"
            value={q}
            autoComplete="off"
            placeholder={placeholder}
            aria-label={placeholder}
            role="combobox"
            aria-autocomplete="list"
            aria-controls="header-search-results"
            aria-expanded={open}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              } else if (e.key === "Escape") {
                setOpen(false);
                input.current?.blur();
              }
            }}
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="hidden rounded border border-line px-1.5 text-[10px] text-muted lg:inline">/</kbd>
        </label>
      </form>

      {open && term.length > 0 && (
        <div id="header-search-results" className="absolute right-0 top-12 z-50 max-h-[70vh] w-[min(420px,90vw)] overflow-y-auto rounded-[14px] border border-line bg-navy-2 p-2 shadow-2xl">
          {term.length < 2 ? (
            <p className="px-3 py-3 text-sm text-muted">{ka.search.minChars}</p>
          ) : !shown ? (
            <p className="px-3 py-3 text-sm text-muted">{ka.search.loading}</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">{loading ? ka.search.loading : ka.search.none}</p>
          ) : (
            <>
              {shown.companies.length > 0 && <Group title={ka.search.companies} />}
              {shown.companies.map((c) => (
                <button key={c.slug} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/companies/${c.slug}`)} className={rowCls(`c-${c.slug}`)}>
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt="" className="size-8 shrink-0 rounded-md border border-line bg-white object-contain p-0.5" />
                  ) : (
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent/15 text-xs font-bold text-accent">
                      {c.name.replace(/^შპს\s*/, "").slice(0, 2)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                    <span className="block truncate text-xs text-muted">{[c.city, c.verified ? ka.search.verified : null].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              ))}
              {shown.offers.length > 0 && <Group title={ka.search.offers} />}
              {shown.offers.map((o) => (
                <button key={o.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/offers/${o.id}`)} className={rowCls(`o-${o.id}`)}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-md ${o.type === "REQUEST" ? "bg-warning/12 text-warning" : "bg-accent/12 text-accent"}`}>
                    <Icon name={o.type === "REQUEST" ? "search" : "box"} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{o.title}</span>
                    <span className="block truncate text-xs text-muted">{[o.category, o.price].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              ))}
              {shown.categories.length > 0 && <Group title={ka.search.categories} />}
              {shown.categories.map((c) => (
                <button key={c.slug} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/categories/${c.slug}`)} className={rowCls(`k-${c.slug}`)}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-chip text-secondary">
                    <Icon name="folder" size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {c.name}
                    {c.parent && <span className="text-xs text-muted"> · {c.parent}</span>}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(allHref)}
                className="mt-1 flex w-full items-center justify-between rounded-lg border-t border-line px-3 pb-1 pt-3 text-sm font-medium text-accent hover:underline"
              >
                {ka.search.all(term)} <Icon name="arrow" size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title }: { title: string }) {
  return <div className="px-3 pb-1 pt-2 text-[11px] font-medium text-muted">{title}</div>;
}
