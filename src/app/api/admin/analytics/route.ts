import { ka } from "@/i18n/ka";
import { industryAnalytics } from "@/lib/admin-analytics";
import { getCurrentUser } from "@/lib/session";
import { readCompanyFilter } from "@/lib/company-filter";

/** CSV export of the admin analytics table (opens in Excel; UTF-8 BOM for Georgian text). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "ADMIN") return new Response("Not found", { status: 404 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { rows, total } = await industryAnalytics(readCompanyFilter(sp));
  const t = ka.analyticsFilter;
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    [t.industryCol, t.companies, t.members, t.offers, t.requests, t.turnover, t.commission],
    ...rows.map((r) => [r.name, r.companies, r.members, r.offers, r.requests, r.turnover.toFixed(2), r.commission.toFixed(2)]),
    ["Σ", total.companies, total.members, total.offers, total.requests, total.turnover.toFixed(2), total.commission.toFixed(2)],
  ].map((l) => l.map(esc).join(","));
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="b2b-analytics.csv"`, "Cache-Control": "no-store" },
  });
}
