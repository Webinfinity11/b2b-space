"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import type { NavGroup } from "./Shell";

/** Admin side menu: every section visible at once, grouped under headings. */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const best = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || (h !== "/admin" && pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label={ka.nav.menu} className="rounded-[20px] border border-line bg-surface p-3 shadow-[0_6px_20px_-12px_rgb(11_18_37/0.25)]">
      {groups.map((g, gi) => (
        <div key={gi} className={gi > 0 ? "mt-1.5 border-t border-line pt-1.5" : ""}>
          {g.title && <div className="px-3 pb-1 pt-1 text-[11px] font-bold text-muted">{g.title}</div>}
          {g.items.map((item) => {
            const active = item.href === best;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[14px] px-3 py-1.5 text-[13px] leading-snug transition-colors ${active ? "bg-accent font-bold text-on-accent" : "font-medium text-ink hover:bg-surface-2"}`}
              >
                {item.icon && <Icon name={item.icon} size={18} />}
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.badge ? (
                  <span className={`grid h-[19px] min-w-[19px] place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums ${active ? "bg-white text-[#1d45d1]" : "bg-accent text-on-accent"}`}>{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
