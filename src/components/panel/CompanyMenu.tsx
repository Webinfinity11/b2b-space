"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ka } from "@/i18n/ka";
import { switchCompanyAction } from "@/actions/panel";
import { Icon } from "@/components/ui/Icon";

/** "ჩემი კომპანია ▾" in the top bar: switch company, open profile/settings. */
export function CompanyMenu({ companies, activeId, links }: { companies: { id: string; name: string }[]; activeId: string | null; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const active = companies.find((c) => c.id === activeId);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex max-w-56 items-center gap-3 whitespace-nowrap py-2 text-[15px] text-ink">
        <span className="truncate">{active ? active.name : ka.sgba.nav.myCompany}</span>
        <Icon name="chevron" size={15} />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-40 w-64 rounded-[14px] border border-line bg-surface p-2 shadow-[0_14px_40px_rgb(33_55_105/0.12)]">
          {companies.length > 1 && (
            <>
              <div className="px-3 pb-1 pt-1.5 text-[11px] text-muted">{ka.panel.switchCompany}</div>
              {companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("companyId", c.id);
                    start(() => switchCompanyAction(fd));
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${c.id === activeId ? "bg-blue-soft font-semibold text-accent" : "hover:bg-chip"}`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === activeId && <Icon name="check" size={15} />}
                </button>
              ))}
              <div className="my-1 h-px bg-line" />
            </>
          )}
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-chip">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
