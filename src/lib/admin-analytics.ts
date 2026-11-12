import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { db } from "./db";
import type { readCompanyFilter } from "./company-filter";

export type IndustryRow = {
  name: string;
  companies: number;
  members: number;
  offers: number;
  requests: number;
  turnover: number;
  commission: number;
};

/**
 * Platform numbers per top-level industry for the companies matching the filter.
 * A company in several industries is counted in each of them; the total row counts it once.
 */
export async function industryAnalytics(f: ReturnType<typeof readCompanyFilter>) {
  const where: Prisma.CompanyWhereInput = { AND: [{ verificationStatus: "VERIFIED" }, ...(f.company ? [f.company] : [])] };
  const companies = await db.company.findMany({
    where,
    select: {
      id: true,
      categories: { where: { category: { kind: "INDUSTRY" } }, select: { category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } } } },
    },
  });
  const ids = companies.map((c) => c.id);
  const since = f.since ? { gte: f.since } : undefined;

  const [members, offers, turnover, commission] = await Promise.all([
    db.companyMember.groupBy({ by: ["companyId"], where: { companyId: { in: ids }, status: "ACTIVE" }, _count: { _all: true } }),
    db.offer.groupBy({ by: ["companyId", "type"], where: { companyId: { in: ids }, status: { not: "DRAFT" }, createdAt: since }, _count: { _all: true } }),
    db.invoice.groupBy({
      by: ["sellerCompanyId"],
      where: { sellerCompanyId: { in: ids }, currency: "GEL", status: { notIn: ["DRAFT", "CANCELLED"] }, issuedAt: since },
      _sum: { paidAmount: true },
    }),
    db.commission.groupBy({ by: ["companyId"], where: { companyId: { in: ids }, currency: "GEL", status: { not: "CANCELLED" }, createdAt: since }, _sum: { amount: true } }),
  ]);

  const perCompany = new Map(ids.map((id) => [id, { members: 0, offers: 0, requests: 0, turnover: 0, commission: 0 }]));
  for (const m of members) perCompany.get(m.companyId)!.members = m._count._all;
  for (const o of offers) {
    const row = perCompany.get(o.companyId!);
    if (row) row[o.type === "REQUEST" ? "requests" : "offers"] += o._count._all;
  }
  for (const t of turnover) perCompany.get(t.sellerCompanyId!)!.turnover = Number(t._sum.paidAmount ?? 0);
  for (const c of commission) {
    const row = perCompany.get(c.companyId!);
    if (row) row.commission = Number(c._sum.amount ?? 0);
  }

  const rows = new Map<string, IndustryRow>();
  const total: IndustryRow = { name: "", companies: 0, members: 0, offers: 0, requests: 0, turnover: 0, commission: 0 };
  const add = (r: IndustryRow, v: Omit<IndustryRow, "name" | "companies">) => {
    r.companies++;
    r.members += v.members;
    r.offers += v.offers;
    r.requests += v.requests;
    r.turnover += v.turnover;
    r.commission += v.commission;
  };
  for (const c of companies) {
    const v = perCompany.get(c.id)!;
    add(total, v);
    const tops = new Map<string, string>();
    for (const cc of c.categories) {
      const top = cc.category.parent ?? cc.category;
      tops.set(top.id, top.name);
    }
    if (tops.size === 0) tops.set("—", ka.analyticsFilter.other);
    for (const [id, name] of tops) {
      const r = rows.get(id) ?? { name, companies: 0, members: 0, offers: 0, requests: 0, turnover: 0, commission: 0 };
      add(r, v);
      rows.set(id, r);
    }
  }
  return { rows: [...rows.values()].sort((a, b) => b.companies - a.companies || b.turnover - a.turnover), total };
}
