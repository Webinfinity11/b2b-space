"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { Logo } from "@/components/ui/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";

export type NavItem = { href: string; label: string; badge?: number; icon?: IconName };
export type NavGroup = { title?: string; items: NavItem[] };

/**
 * Shared responsive workspace shell (navy design): sidebar + top bar.
 * Each panel (participant / admin) has its own layout, navigation and guards.
 */
export function Shell({
  groups,
  top,
  sidebarTop,
  sidebarBottom,
  children,
  variant,
  homeHref,
  footerNote,
  mainClassName = "mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8",
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
  const isActive = (href: string) => href === best;

  const sidebar = (
    <div className="flex h-full flex-col px-4 pb-4 pt-5">
      <div className="flex items-center justify-between px-1">
        <Logo href={homeHref} />
        {variant === "admin" && <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">ADMIN</span>}
        <button type="button" onClick={() => setOpen(false)} aria-label={ka.nav.close} className="grid size-8 place-items-center rounded-full text-secondary hover:bg-chip lg:hidden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
      </div>
      {sidebarTop && <div className="mt-6">{sidebarTop}</div>}
      <nav className="mt-6 flex-1 overflow-y-auto pr-1">
        {groups.map((g, i) => (
          <div key={i} className="mt-5 first:mt-0">
            {g.title && <div className="mb-1.5 truncate px-3 text-[11px] font-medium text-muted">{g.title}</div>}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                        active ? "bg-accent font-semibold text-deep shadow-[0_3px_16px_rgb(142_197_237/0.07)]" : "text-secondary hover:bg-accent/[0.065] hover:text-ink"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {item.icon && <Icon name={item.icon} size={17} />}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge ? (
                        <span className={`rounded-md px-1.5 text-[11px] font-semibold tabular-nums ${active ? "bg-deep/15" : "bg-chip text-secondary"}`}>{item.badge}</span>
                      ) : active ? (
                        <span aria-hidden="true" className="size-1 rounded-full bg-deep" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {sidebarBottom && <div className="mt-4 space-y-3">{sidebarBottom}</div>}
      {footerNote ?? (
        <Link href="/" className="mt-3 flex items-center gap-2 px-3 text-[11px] text-muted hover:text-secondary">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-success" /> {ka.nav.backToSite}
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas lg:pl-[264px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line bg-navy lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={ka.nav.close} className="absolute inset-0 bg-[rgb(2_9_20/0.7)]" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-line bg-navy shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex min-h-[72px] items-center gap-3 border-b border-line bg-navy/90 px-4 backdrop-blur sm:px-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ka.nav.menu}
          className="grid size-10 place-items-center rounded-full border border-line text-secondary hover:text-ink lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="shrink-0 sm:hidden">
          <Logo href={homeHref} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 max-sm:[&>div:first-child]:hidden max-sm:justify-end">{top}</div>
      </header>
      <main className={mainClassName}>{children}</main>
    </div>
  );
}
