"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";
import { BrandMarkSvg } from "@/components/ui/BrandMark";

export type NavItem = { href: string; label: string; badge?: number; icon?: IconName };
export type NavGroup = { title?: string; items: NavItem[] };

/**
 * Workspace shell (B2B Space dashboard design): narrow white icon rail on the left with tooltips,
 * sticky white top bar. On phones the rail becomes a drawer with labels.
 */
export function Shell({
  groups,
  top,
  sidebarBottom,
  children,
  homeHref,
  mainClassName = "px-4 py-6 sm:px-8",
}: {
  footerNote?: ReactNode;
  mainClassName?: string;
  groups: NavGroup[];
  top: ReactNode;
  sidebarTop?: ReactNode;
  sidebarBottom?: ReactNode;
  children: ReactNode;
  variant: "panel" | "admin" | "site";
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer on navigation
  useEffect(() => setOpen(false), [pathname]);

  // Only the most specific matching item is active (e.g. /company/team, not also /company).
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const matches = (href: string) => pathname === href || (href !== homeHref && pathname.startsWith(`${href}/`));
  const best = allHrefs.filter(matches).sort((a, b) => b.length - a.length)[0];

  const rail = (
    <div className="flex h-full flex-col items-center px-3 pb-4">
      <Link href={homeHref} aria-label={ka.brand} title={ka.brand} className="grid h-[72px] w-[50px] shrink-0 place-items-center">
        <BrandMarkSvg />
      </Link>
      {groups.map((g, gi) => (
        <div key={gi} className="flex w-full flex-col items-center">
          {gi > 0 && <div className="my-4 h-px w-11 shrink-0 bg-line" />}
          <nav className="flex flex-col items-center gap-1.5" aria-label={g.title ?? ka.nav.menu}>
            {g.items.map((item) => {
              const active = item.href === best;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`group relative grid h-[46px] w-[54px] place-items-center rounded-[12px] transition-colors ${
                    active ? "bg-blue-soft text-accent" : "text-ink hover:bg-chip hover:text-accent"
                  }`}
                >
                  {item.icon && <Icon name={item.icon} size={24} />}
                  {item.badge ? (
                    <span className="absolute right-1 top-0.5 grid h-[19px] min-w-[19px] place-items-center rounded-full border-2 border-surface bg-accent px-1 text-[10px] font-bold text-white tabular-nums">{item.badge}</span>
                  ) : null}
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap nav-tip rounded-[8px] border border-white/10 bg-deep px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
      <div className="min-h-6 flex-1" />
      {sidebarBottom}
    </div>
  );

  const drawer = (
    <div className="flex h-full flex-col overflow-y-auto bg-surface px-4 pb-4">
      <div className="flex h-[68px] items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-2.5">
          <BrandMarkSvg className="h-[34px] w-[26px]" />
          <Wordmark size="sm" />
        </Link>
        <button type="button" onClick={() => setOpen(false)} aria-label={ka.nav.close} className="grid size-9 place-items-center rounded-full text-secondary hover:bg-chip">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </div>
      {groups.map((g, gi) => (
        <div key={gi} className={gi > 0 ? "mt-3 border-t border-line pt-3" : ""}>
          {g.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-sm ${item.href === best ? "bg-blue-soft font-semibold text-accent" : "text-ink hover:bg-chip"}`}
            >
              <span className="flex items-center gap-3">
                {item.icon && <Icon name={item.icon} size={20} />}
                {item.label}
              </span>
              {item.badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas lg:pl-[86px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[86px] border-r border-line bg-surface/95 lg:block">{rail}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={ka.nav.close} className="absolute inset-0 bg-[rgb(11_18_37/0.35)]" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">{drawer}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-8">
        <button type="button" onClick={() => setOpen(true)} aria-label={ka.nav.menu} className="grid size-10 shrink-0 place-items-center rounded-[10px] text-ink hover:bg-chip lg:hidden">
          <Icon name="menu" size={22} />
        </button>
        {top}
      </header>
      <main className={`mx-auto max-w-[1900px] ${mainClassName}`}>{children}</main>
    </div>
  );
}
