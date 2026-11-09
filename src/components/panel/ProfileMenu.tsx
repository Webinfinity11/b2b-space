"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ka } from "@/i18n/ka";
import { logoutAction } from "@/actions/auth";
import { Icon } from "@/components/ui/Icon";

export function ProfileMenu({ initials, firstName, fullName, sub, profileHref }: { initials: string; firstName: string; fullName: string; sub: string; profileHref: string }) {
  const [open, setOpen] = useState(false);
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
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm text-secondary hover:text-ink">
        <span aria-hidden="true" className="grid size-9 place-items-center rounded-full border-2 border-line bg-gradient-to-br from-[#B8D9F1] to-[#5A7F9D] text-xs font-extrabold text-deep">
          {initials}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{firstName}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-64 rounded-[14px] border border-line bg-navy-2 p-2 shadow-2xl">
          <div className="px-3 py-2">
            <div className="text-sm font-semibold">{fullName}</div>
            <div className="mt-0.5 text-xs text-muted">{sub}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href={profileHref} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-secondary hover:bg-accent/[0.065] hover:text-ink">
            {ka.panel.profile} <Icon name="user" size={15} />
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-secondary hover:bg-accent/[0.065] hover:text-ink">
              {ka.nav.logout} <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
