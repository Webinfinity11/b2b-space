"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import type { NavGroup, NavItem } from "./Shell";

const badge = "grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#ffc247] px-1 text-[10px] font-bold text-[#0b1225] tabular-nums";

/**
 * Admin navigation: the untitled group is shown as direct pills, every titled
 * group is a labelled dropdown (its pill carries the sum of its counters).
 */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const best = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || (h !== "/admin" && pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0];
  const pill = (active: boolean) =>
    `flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] transition-colors ${active ? "bg-white font-bold text-[#0b1225]" : "font-medium text-secondary hover:bg-chip hover:text-ink"}`;
  const count = (items: NavItem[]) => items.reduce((n, i) => n + (i.badge ?? 0), 0);

  return (
    <nav aria-label={ka.nav.menu} className="flex flex-wrap items-center gap-1">
      {groups.map((g, gi) => {
        if (!g.title) {
          return g.items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={item.href === best ? "page" : undefined} className={pill(item.href === best)}>
              {item.icon && <Icon name={item.icon} size={16} />}
              {item.short ?? item.label}
              {item.badge ? <span className={badge}>{item.badge}</span> : null}
            </Link>
          ));
        }
        const current = g.items.find((i) => i.href === best);
        const total = count(g.items);
        return (
          // Remounts on navigation (closes itself); the shared name keeps only one menu open.
          <details key={`${gi}:${pathname}`} name="admin-nav" className="group relative">
            <summary className={`${pill(!!current)} cursor-pointer list-none`}>
              {g.title}
              {total ? <span className={badge}>{total}</span> : null}
              <Icon name="chevron" size={13} className="group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-[42px] z-40 w-64 rounded-[16px] border border-line bg-surface p-2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]">
              {g.items.map((item) => (
                <Link key={item.href} href={item.href} aria-current={item.href === best ? "page" : undefined} className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] ${item.href === best ? "bg-chip font-bold text-ink" : "text-secondary hover:bg-chip hover:text-ink"}`}>
                  {item.icon && <Icon name={item.icon} size={17} />}
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? <span className={badge}>{item.badge}</span> : null}
                </Link>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
