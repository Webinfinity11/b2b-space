import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { CITIES } from "./cities";
import { param } from "./params";

export const PERIODS = ["30", "90", "180", "365"] as const;
const SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
const ROLES = ["BUYER", "SELLER", "BOTH"] as const;

export type CompanyFilterValues = { industry?: string; size?: string; city?: string; role?: string; period?: string };

type SP = Record<string, string | string[] | undefined>;

/** Reads the analytics company filter from the query string (unknown values are ignored). */
export function readCompanyFilter(sp: SP) {
  const pick = <T extends string>(v: string | undefined, list: readonly T[]) => (v && (list as readonly string[]).includes(v) ? (v as T) : undefined);
  const values: CompanyFilterValues = {
    industry: param(sp.industry) || undefined,
    size: pick(param(sp.size), SIZES),
    city: pick(param(sp.city), CITIES),
    role: pick(param(sp.role), ROLES),
    period: pick(param(sp.period), PERIODS),
  };
  const and: Prisma.CompanyWhereInput[] = [];
  if (values.industry) and.push({ categories: { some: { OR: [{ categoryId: values.industry }, { category: { parentId: values.industry } }] } } });
  if (values.size) and.push({ size: values.size as (typeof SIZES)[number] });
  if (values.city) and.push({ city: values.city });
  // "Buyer" also matches companies that do both, same for "seller".
  if (values.role) and.push({ businessRole: values.role === "BOTH" ? "BOTH" : { in: [values.role as "BUYER" | "SELLER", "BOTH"] } });
  const since = values.period ? new Date(Date.now() - Number(values.period) * 864e5) : null;
  const active = Boolean(and.length || since);
  return { values, company: and.length ? ({ AND: and } as Prisma.CompanyWhereInput) : null, since, active };
}
