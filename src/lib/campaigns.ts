import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/** Which approved companies a campaign reaches (empty filter = everyone). The requester is excluded. */
export function audienceWhere(r: { companyId: string; industryIds: string[]; cities: string[]; sizes: string[]; roles: string[]; positionIds?: string[] }): Prisma.CompanyWhereInput {
  const and: Prisma.CompanyWhereInput[] = [{ verificationStatus: "VERIFIED" }, { id: { not: r.companyId } }];
  if (r.industryIds.length) and.push({ categories: { some: { categoryId: { in: r.industryIds } } } });
  if (r.cities.length) and.push({ city: { in: r.cities } });
  if (r.sizes.length) and.push({ size: { in: r.sizes as ("SMALL" | "MEDIUM" | "LARGE")[] } });
  if (r.roles.length) and.push({ businessRole: { in: r.roles as ("BUYER" | "SELLER" | "BOTH")[] } });
  // Position targeting: the company must have an active employee in one of the chosen positions.
  if (r.positionIds?.length) and.push({ members: { some: { status: "ACTIVE", positionId: { in: r.positionIds } } } });
  return { AND: and };
}

/** Status path shown as a stepper (REJECTED is shown separately). */
export const CAMPAIGN_STEPS = ["NEW", "IN_PROGRESS", "APPROVED", "RUNNING", "DONE"] as const;
