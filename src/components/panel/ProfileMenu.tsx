"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ka } from "@/i18n/ka";
import { logoutAction } from "@/actions/auth";
import { Icon } from "@/components/ui/Icon";

export function ProfileMenu({ initials, fullName, sub, profileHref }: { initials: string; firstName: string; fullName: string; sub: string; profileHref: string }) {
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
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={fullName} title={fullName} className="grid size-10 place-items-center rounded-full bg-blue-soft text-sm font-bold text-ink hover:ring-2 hover:ring-[#c9d5ef]">
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-64 rounded-[14px] border border-line bg-surface p-2 shadow-[0_14px_40px_rgb(33_55_105/0.12)]">
          <div className="px-3 py-2">
            <div className="text-sm font-semibold">{fullName}</div>
            <div className="mt-0.5 text-xs text-muted">{sub}</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href={profileHref} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-secondary hover:bg-chip hover:text-ink">
            {ka.panel.profile} <Icon name="user" size={15} />
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-secondary hover:bg-chip hover:text-ink">
              {ka.nav.logout} <Icon name="logout" size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
