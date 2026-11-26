"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import type { NavGroup, NavItem } from "./Shell";

const count = "rounded-full bg-accent px-1.5 text-[10px] font-bold text-on-accent tabular-nums";

/**
 * Admin header navigation, styled like the member pill bar: one row stretched over the free width.
 * The untitled group is shown directly; every titled group is a dropdown with its counters summed.
 */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const best = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || (h !== "/admin" && pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0];
  const pill = (active: boolean) =>
    `flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] transition-colors ${active ? "bg-surface-2 font-bold text-ink" : "font-medium text-secondary hover:text-ink"}`;
  const badge = (items: NavItem[]) => {
    const n = items.reduce((sum, i) => sum + (i.badge ?? 0), 0);
    return n ? <span className={count}>{n}</span> : null;
  };

  return (
    <nav aria-label={ka.nav.menu} className="hidden min-w-0 flex-1 items-center justify-between rounded-full bg-surface p-1 shadow-[0_6px_20px_-12px_rgb(11_18_37/0.25)] xl:flex">
      {groups.map((g, gi) => {
        if (!g.title) {
          return g.items.map((item) => (
            <Link key={item.href} href={item.href} title={item.label} aria-current={item.href === best ? "page" : undefined} className={`${pill(item.href === best)} flex-auto`}>
              {item.href === best && item.icon && <Icon name={item.icon} size={16} />}
              {item.short ?? item.label}
              {badge([item])}
            </Link>
          ));
        }
        const current = g.items.some((i) => i.href === best);
        return (
          // Remounts on navigation (closes itself); the shared name keeps only one menu open.
          <details key={`${gi}:${pathname}`} name="admin-nav" className="group relative flex-auto">
            <summary className={`${pill(current)} cursor-pointer list-none`}>
              {g.title}
              {badge(g.items)}
              <Icon name="chevron" size={13} className="group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-[48px] z-40 w-64 rounded-[16px] border border-line bg-surface p-2 shadow-[0_18px_40px_rgb(11_18_37/0.18)]">
              {g.items.map((item) => (
                <Link key={item.href} href={item.href} aria-current={item.href === best ? "page" : undefined} className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] ${item.href === best ? "bg-surface-2 font-bold text-ink" : "text-secondary hover:bg-chip hover:text-ink"}`}>
                  {item.icon && <Icon name={item.icon} size={17} />}
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? <span className={count}>{item.badge}</span> : null}
                </Link>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
