import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { db } from "./db";
import { notify } from "./notify";
import { hasPermission } from "./permissions";

/** Industry ids of a company (Category kind INDUSTRY, including parents of chosen sub-industries). */
export async function companyIndustryIds(companyId: string) {
  const rows = await db.companyCategory.findMany({
    where: { companyId, category: { kind: "INDUSTRY" } },
    select: { category: { select: { id: true, parentId: true } } },
  });
  return [...new Set(rows.flatMap((r) => [r.category.id, ...(r.category.parentId ? [r.category.parentId] : [])]))];
}

/** Offers meant for these industries: targeted at one of them, or at every sector. */
export function offersForIndustries(industryIds: string[]): Prisma.OfferWhereInput {
  return { OR: [{ allSectors: true }, ...(industryIds.length ? [{ targetIndustryIds: { hasSome: industryIds } }] : [])] };
}

/**
 * First publication of a sector-targeted offer/request: tell the matching companies.
 * Offers go to buyers' procurement (purchasing), requests to suppliers' sales (responses.manage).
 * "All sectors" posts are not pushed to everyone — they only appear on dashboards (broadcast = paid campaign).
 */
export async function notifyMatchingSectors(offerId: string) {
  const offer = await db.offer.findUnique({
    where: { id: offerId },
    select: { id: true, type: true, title: true, targetIndustryIds: true, isAnonymous: true, companyId: true, company: { select: { legalName: true, tradeName: true } } },
  });
  if (!offer || offer.targetIndustryIds.length === 0) return;
  const members = await db.companyMember.findMany({
    where: {
      status: "ACTIVE",
      company: {
        verificationStatus: "VERIFIED",
        id: { not: offer.companyId ?? "" },
        categories: { some: { categoryId: { in: offer.targetIndustryIds } } },
      },
    },
    select: { userId: true, role: true, permissions: true },
  });
  const permission = offer.type === "REQUEST" ? "responses.manage" : "purchasing";
  const userIds = members.filter((m) => hasPermission(m, permission)).map((m) => m.userId);
  const from = offer.isAnonymous || !offer.company ? ka.offer.anonymous : offer.company.tradeName || offer.company.legalName;
  const title = offer.type === "REQUEST" ? ka.notifications.matchingRequest(from, offer.title) : ka.notifications.matchingOffer(from, offer.title);
  await notify(userIds, { type: "MATCHING_OFFER", title, link: `/offers/${offer.id}` });
}
