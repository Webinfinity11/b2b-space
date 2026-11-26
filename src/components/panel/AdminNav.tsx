"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import type { NavGroup } from "./Shell";

/** Admin navigation: the member pill bar, unfolded — every section is visible, wrapping onto a second row. */
export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const items = groups.flatMap((g) => g.items);
  const best = items
    .map((i) => i.href)
    .filter((h) => pathname === h || (h !== "/admin" && pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label={ka.nav.menu} className="flex flex-wrap justify-center gap-1 rounded-[28px] bg-surface p-1.5 shadow-[0_6px_20px_-12px_rgb(11_18_37/0.25)]">
      {items.map((item) => {
        const active = item.href === best;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors ${active ? "bg-surface-2 font-bold text-ink" : "font-medium text-secondary hover:text-ink"}`}
          >
            {item.icon && <Icon name={item.icon} size={16} />}
            {item.short ?? item.label}
            {item.badge ? <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-on-accent tabular-nums">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
