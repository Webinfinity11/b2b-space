"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";

type Option = { value: string; label: string };

type Props = {
  q?: string;
  category?: string;
  categories: Option[];
  /** Undefined when the company has no sector, so there is nothing to switch between. */
  scope?: Option[];
  scopeValue?: string;
  sort?: string;
  badge?: string;
  type?: "REQUEST";
  /** Where "clear" leads; undefined when no filter is applied. */
  clearHref?: string;
  total: number;
  pills: ReactNode;
  action: ReactNode;
};

const cross = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="m6 6 12 12M6 18 18 6" />
  </svg>
);

/** Offers search bar: results follow the typing and every choice applies at once. */
export function OfferFilters({ q, category, categories, scope, scopeValue, sort, badge, type, clearHref, total, pills, action }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The URL can change from outside the field (back button, "clear"); never overwrite what is being typed.
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) input.current.value = q ?? "";
  }, [q]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (url: string) => start(() => router.replace(url, { scroll: false }));
  const apply = () => {
    clearTimeout(timer.current);
    if (!form.current) return;
    const p = new URLSearchParams();
    for (const [k, v] of new FormData(form.current)) if (typeof v === "string" && v.trim()) p.set(k, v.trim());
    go(p.size ? `/offers?${p}` : "/offers");
  };
  const typed = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(apply, 350);
  };
  const clearSearch = () => {
    if (!input.current) return;
    input.current.value = "";
    input.current.focus();
    apply();
  };
  const clearAll = () => {
    clearTimeout(timer.current);
    if (input.current) input.current.value = "";
    go(clearHref!);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    apply();
  };

  const select = (name: string, label: string, value: string, options: Option[], className = "") => (
    <span className={`relative block w-full sm:w-auto ${className}`}>
      <select
        // Remount when the URL changes so the shown value always matches the results.
        key={value}
        name={name}
        defaultValue={value}
        onChange={apply}
        aria-label={label}
        className={`h-11 w-full cursor-pointer appearance-none rounded-full! border bg-surface pl-4 pr-10 text-[13px] text-ink transition-colors hover:border-ink/40 sm:min-w-[190px] ${value ? "border-ink font-semibold" : "border-line"}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
        <Icon name="chevron" size={13} />
      </span>
    </span>
  );

  return (
    <form ref={form} action="/offers" role="search" onSubmit={submit} aria-busy={pending} className="mb-3 rounded-[28px] bg-surface p-2.5 shadow-[0_10px_30px_-18px_rgb(11_18_37/0.25)]">
      {type && <input type="hidden" name="type" value={type} />}
      {badge && <input type="hidden" name="badge" value={badge} />}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-full border border-line pl-4 pr-2 text-muted transition-colors hover:border-ink/40 focus-within:border-ink">
          {pending ? <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" /> : <Icon name="search" size={16} />}
          <input
            ref={input}
            name="q"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={100}
            defaultValue={q}
            onChange={typed}
            onKeyDown={(e) => e.key === "Escape" && clearSearch()}
            placeholder={ka.catalog.searchPlaceholder}
            aria-label={ka.catalog.searchPlaceholder}
            className="peer min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted outline-none!"
          />
          <button type="button" onClick={clearSearch} aria-label={ka.sgba.clearSearch} className="grid size-7 shrink-0 place-items-center rounded-full bg-chip text-muted hover:bg-ink hover:text-surface peer-placeholder-shown:hidden">
            {cross}
          </button>
        </label>
        {select("category", ka.sgba.categoryAll, category ?? "", [{ value: "", label: ka.sgba.categoryAll }, ...categories])}
        {scope && select("scope", ka.sectors.filterForMe, scopeValue ?? "", scope)}
        <button type="submit" className="h-11 w-full rounded-full bg-ink px-10 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 sm:w-auto">{ka.sgba.searchButton}</button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {pills}
          {clearHref && (
            <>
              <span className="px-1 text-[13px] text-muted" role="status">{ka.sgba.found(total)}</span>
              <button type="button" onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-accent hover:bg-blue-soft">
                {cross} {ka.sgba.clearFilters}
              </button>
            </>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {select("sort", ka.sgba.sortNewest, sort ?? "", [{ value: "", label: ka.sgba.sortNewest }, { value: "validUntil", label: ka.sgba.sortExpiring }])}
          {action}
        </div>
      </div>
    </form>
  );
}
