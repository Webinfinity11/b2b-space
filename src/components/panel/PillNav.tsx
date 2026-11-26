"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ka } from "@/i18n/ka";
import { Icon } from "@/components/ui/Icon";
import type { NavGroup, NavItem } from "./Shell";

/** Sections shown directly in the header; everything else goes under "მეტი". */
const MAIN = ["/app", "/offers", "/companies", "/app/conversations", "/app/analytics"];

/** Centered pill navigation of the member header. */
export function PillNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const all = groups.flatMap((g) => g.items);
  const best = all
    .map((i) => i.href)
    .filter((h) => pathname === h || (h !== "/app" && pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0];
  const main = MAIN.map((h) => all.find((i) => i.href === h)).filter((i): i is NavItem => !!i);
  const more = all.filter((i) => !MAIN.includes(i.href));
  const pill = (active: boolean) =>
    `flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors ${active ? "bg-surface-2 font-bold text-ink" : "font-medium text-secondary hover:text-ink"}`;
  const moreActive = more.some((i) => i.href === best);

  return (
    <nav aria-label={ka.nav.menu} className="mx-auto hidden items-center gap-0.5 rounded-full bg-surface p-1 shadow-[0_6px_20px_-12px_rgb(11_18_37/0.25)] xl:flex">
      {main.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.href === best ? "page" : undefined} className={pill(item.href === best)}>
          {item.href === best && item.icon && <Icon name={item.icon} size={16} />}
          {item.label}
        </Link>
      ))}
      <details key={pathname} className="group relative">
        <summary className={`${pill(moreActive)} cursor-pointer list-none`}>
          {ka.sgba.nav.more}
          <Icon name="chevron" size={13} className="group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 top-[48px] z-40 w-60 rounded-[16px] border border-line bg-surface p-2 shadow-[0_18px_40px_rgb(11_18_37/0.18)]">
          {more.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] ${item.href === best ? "bg-surface-2 font-bold text-ink" : "text-secondary hover:bg-chip hover:text-ink"}`}>
              {item.icon && <Icon name={item.icon} size={17} />}
              <span className="flex-1">{item.label}</span>
              {item.badge ? <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
