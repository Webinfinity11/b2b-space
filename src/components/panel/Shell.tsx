"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";
import { BrandMarkSvg } from "@/components/ui/BrandMark";

export type NavItem = { href: string; label: string; short?: string; badge?: number; icon?: IconName };
export type NavGroup = { title?: string; items: NavItem[] };

/**
 * Workspace shell. Member: pill nav inside `top`. Admin: same header, with grouped navigation (AdminNav) inside `top`.
 * On narrow screens the sections move into a drawer.
 */
export function Shell({
  variant,
  groups,
  top,
  children,
  homeHref,
  mainClassName = "px-4 pb-8 pt-2 sm:px-8",
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
          {variant === "admin" && g.title && <div className="px-3 pb-1 text-[11px] font-bold text-muted">{g.title}</div>}
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

  const mobileDrawer = open && (
    <div className={`fixed inset-0 z-50 ${"xl:hidden"}`}>
      <button type="button" aria-label={ka.nav.close} className="absolute inset-0 bg-[rgb(11_18_37/0.35)]" onClick={() => setOpen(false)} />
      <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">{drawer}</aside>
    </div>
  );
  const menuButton = (
    <button type="button" onClick={() => setOpen(true)} aria-label={ka.nav.menu} className={`grid size-10 shrink-0 place-items-center rounded-[10px] text-ink hover:bg-chip ${"xl:hidden"}`}>
      <Icon name="menu" size={22} />
    </button>
  );

  // Member workspace: marketplace-style header with the sections in a row (no side rail).
  if (variant !== "admin") {
    return (
      <div className="member min-h-dvh bg-surface-2">
        {mobileDrawer}
        <header className="relative z-30">
          <div className="mx-auto flex h-[84px] max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-8">
            {menuButton}
            <Link href={homeHref} aria-label={ka.brand} className="hidden shrink-0 sm:block">
              <BrandMarkSvg className="h-[34px] w-[26px]" />
            </Link>
            {top}
          </div>
        </header>
        <main className={`mx-auto max-w-[1440px] ${mainClassName}`}>{children}</main>
      </div>
    );
  }

  // Admin: the member design; `top` carries AdminNav in the header line.
  return (
    <div className="member admin min-h-dvh bg-surface-2">
      {mobileDrawer}
      <header className="relative z-30">
        <div className="mx-auto flex h-[84px] max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-8">
          {menuButton}
          <Link href={homeHref} aria-label={ka.brand} className="hidden shrink-0 sm:block">
            <BrandMarkSvg className="h-[34px] w-[26px]" />
          </Link>
          {top}
        </div>
      </header>
      <main className={`mx-auto max-w-[1440px] ${mainClassName}`}>{children}</main>
    </div>
  );
}
