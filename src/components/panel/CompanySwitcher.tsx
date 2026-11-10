"use client";

import { useTransition } from "react";
import { ka } from "@/i18n/ka";
import { switchCompanyAction } from "@/actions/panel";

export function CompanySwitcher({ companies, activeId }: { companies: { id: string; name: string }[]; activeId: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="block">
      <span className="mb-1 block px-1 text-[11px] text-muted">{ka.panel.switchCompany}</span>
      <select
        defaultValue={activeId}
        disabled={pending}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("companyId", e.target.value);
          start(() => switchCompanyAction(fd));
        }}
        className="h-10 w-full rounded-[10px] border border-white/15 bg-white/5 px-3 text-sm text-white focus:outline-none [&>option]:bg-white [&>option]:text-ink"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </label>
  );
}
