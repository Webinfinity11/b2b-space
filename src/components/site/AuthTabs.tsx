"use client";

import { useState, type ReactNode } from "react";
import { ka } from "@/i18n/ka";

/** Sign-in / registration on one page: tabs switch instantly and keep the URL in sync. */
export function AuthTabs({ initial, login, register }: { initial: "login" | "register"; login: ReactNode; register: ReactNode }) {
  const [tab, setTab] = useState(initial);
  const go = (t: "login" | "register") => {
    setTab(t);
    const url = new URL(window.location.href);
    url.pathname = t === "login" ? "/login" : "/register";
    url.searchParams.delete("registered");
    window.history.replaceState(null, "", url);
  };
  const tabs = [
    { id: "login" as const, label: ka.sgba.tabLogin },
    { id: "register" as const, label: ka.sgba.tabRegister },
  ];
  return (
    <div>
      <div role="tablist" aria-label={ka.sgba.cabinet} className="mb-7 grid grid-cols-2 gap-1 rounded-[12px] bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => go(t.id)}
            className={`h-10 rounded-[10px] text-sm font-bold transition-colors ${tab === t.id ? "bg-surface text-ink shadow-[0_2px_8px_rgb(33_55_105/0.08)]" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "login" ? login : register}</div>
    </div>
  );
}
