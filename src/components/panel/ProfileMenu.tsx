"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ka } from "@/i18n/ka";
import { logoutAction } from "@/actions/auth";
import { switchCompanyAction } from "@/actions/panel";
import { Icon } from "@/components/ui/Icon";

/** One account control: avatar + name + company, with company switching, profile links and logout inside. */
export function ProfileMenu({
  initials,
  fullName,
  sub,
  profileHref,
  avatarUrl,
  companies = [],
  activeCompanyId = null,
  links = [],
}: {
  initials: string;
  firstName?: string;
  fullName: string;
  sub: string;
  profileHref: string;
  avatarUrl?: string | null;
  companies?: { id: string; name: string }[];
  activeCompanyId?: string | null;
  links?: { href: string; label: string }[];
}) {
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
  const item = "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-secondary hover:bg-chip hover:text-ink";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={fullName}
        className="flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 transition-colors hover:border-accent/40 max-sm:pr-1"
      >
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-[13px] font-bold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : initials}
        </span>
        <span className="hidden min-w-0 max-w-[190px] text-left leading-tight sm:block">
          <span className="block truncate text-[13px] font-bold text-ink">{fullName}</span>
          <span className="block truncate text-[11px] text-muted">{sub}</span>
        </span>
        <Icon name="chevron" size={14} className={`hidden text-muted transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[52px] z-40 w-72 rounded-[13px] border border-line bg-surface p-2 shadow-[0_14px_40px_rgb(33_55_105/0.14)]">
          <div className="px-3 py-2">
            <div className="text-sm font-bold text-ink">{fullName}</div>
            <div className="mt-0.5 text-xs text-muted">{sub}</div>
          </div>
          {companies.length > 1 && (
            <>
              <div className="my-1 h-px bg-line" />
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
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${c.id === activeCompanyId ? "bg-blue-soft font-semibold text-accent" : "hover:bg-chip"}`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === activeCompanyId && <Icon name="check" size={15} />}
                </button>
              ))}
            </>
          )}
          <div className="my-1 h-px bg-line" />
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={item}>
              {l.label}
            </Link>
          ))}
          <Link href={profileHref} onClick={() => setOpen(false)} className={item}>
            {ka.panel.profile} <Icon name="user" size={15} />
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={`${item} w-full`}>
              {ka.nav.logout} <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
