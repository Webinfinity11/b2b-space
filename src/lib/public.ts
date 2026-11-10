import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

/**
 * Public data access. Everything returned from here may be rendered to guests,
 * so selects are explicit and anonymous offers are mapped through toPublicOffer().
 */

export const PUBLIC_OFFER_STATUSES = ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"] as const;

export const publicCompanySelect = {
  id: true,
  slug: true,
  legalName: true,
  tradeName: true,
  city: true,
  country: true,
  description: true,
  logoUrl: true,
  verificationStatus: true,
  customCategory: true,
  businessRole: true,
  size: true,
  direction: true,
  categories: { select: { category: { select: { name: true, slug: true } } } },
} satisfies Prisma.CompanySelect;

export type PublicCompanyCard = Prisma.CompanyGetPayload<{ select: typeof publicCompanySelect }>;

export function companyName(c: { tradeName: string | null; legalName: string }) {
  return c.tradeName || c.legalName;
}

/** Companies visible in the network: only those approved by an administrator. */
const listedCompany: Prisma.CompanyWhereInput = { verificationStatus: "VERIFIED" };

/** kind: "OFFER" (special-offer categories) or "INDUSTRY" (company industries). */
export async function getCategoryTree(kind: "OFFER" | "INDUSTRY" = "INDUSTRY") {
  const all = await db.category.findMany({
    where: { isActive: true, kind },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });
  const roots = all.filter((c) => !c.parentId);
  return roots.map((r) => ({ ...r, children: all.filter((c) => c.parentId === r.id) }));
}

export type CategoryNode = Awaited<ReturnType<typeof getCategoryTree>>[number];

export async function getPopularCategories(limit = 8, kind: "OFFER" | "INDUSTRY" = "OFFER") {
  const cats = await db.category.findMany({
    where: { isActive: true, parentId: null, kind },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { companies: { where: { company: listedCompany } } } },
    },
  });
  return cats.slice(0, limit);
}

export type CompanyFilters = {
  q?: string;
  category?: string;
  city?: string;
  country?: string;
  verified?: boolean;
  role?: "BUYER" | "SELLER" | "BOTH";
  size?: "SMALL" | "MEDIUM" | "LARGE";
  sort?: "newest" | "name";
  page?: number;
  pageSize?: number;
};

export const PAGE_SIZE = 12;

export async function searchCompanies(f: CompanyFilters) {
  const where: Prisma.CompanyWhereInput = { AND: [listedCompany] };
  const and = where.AND as Prisma.CompanyWhereInput[];
  if (f.q) {
    and.push({
      OR: [
        { legalName: { contains: f.q, mode: "insensitive" } },
        { tradeName: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
        { activities: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.category) {
    const cat = await db.category.findUnique({ where: { slug: f.category }, select: { id: true, children: { select: { id: true } } } });
    const ids = cat ? [cat.id, ...cat.children.map((c) => c.id)] : ["__none__"];
    and.push({ categories: { some: { categoryId: { in: ids } } } });
  }
  if (f.city) and.push({ city: { equals: f.city, mode: "insensitive" } });
  if (f.country) and.push({ country: f.country });
  if (f.verified) and.push({ verificationStatus: "VERIFIED" });
  if (f.role) and.push({ businessRole: f.role });
  if (f.size) and.push({ size: f.size });
  if (f.q) (and[1] as Prisma.CompanyWhereInput).OR!.push({ direction: { contains: f.q, mode: "insensitive" } });

  const page = Math.max(1, f.page ?? 1);
  const [total, items] = await Promise.all([
    db.company.count({ where }),
    db.company.findMany({
      where,
      select: publicCompanySelect,
      orderBy: f.sort === "name" ? [{ tradeName: "asc" }, { legalName: "asc" }] : [{ verificationStatus: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * (f.pageSize ?? PAGE_SIZE),
      take: f.pageSize ?? PAGE_SIZE,
    }),
  ]);
  return { total, items, page, pages: Math.max(1, Math.ceil(total / (f.pageSize ?? PAGE_SIZE))) };
}

export async function getCompanyCities() {
  const rows = await db.company.findMany({
    where: { ...listedCompany, city: { not: null } },
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city!).filter(Boolean);
}

export async function getNewCompanies(limit = 6) {
  return db.company.findMany({
    where: listedCompany,
    select: publicCompanySelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getPublicCompany(slug: string) {
  return db.company.findFirst({
    where: { slug, ...listedCompany },
    select: {
      ...publicCompanySelect,
      activities: true,
      website: true,
      facebookUrl: true,
      linkedinUrl: true,
      instagramUrl: true,
      showEmailPublicly: true,
      showPhonePublicly: true,
      contactEmail: true,
      contactPhone: true,
      createdAt: true,
      media: { orderBy: { sortOrder: "asc" }, select: { id: true, type: true, url: true, caption: true } },
    },
  });
}

// ─────────────────────────────── Offers ───────────────────────────────

const offerInternalSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  itemKind: true,
  priceType: true,
  priceMin: true,
  priceMax: true,
  currency: true,
  quantity: true,
  unit: true,
  deliveryTerms: true,
  city: true,
  country: true,
  validUntil: true,
  visibility: true,
  status: true,
  publishedAt: true,
  isAnonymous: true,
  perk: true,
  audience: true,
  tag: true,
  commissionPct: true,
  commissionText: true,
  authorUserId: true,
  category: { select: { name: true, slug: true } },
  company: { select: { slug: true, legalName: true, tradeName: true, logoUrl: true, verificationStatus: true } },
  author: { select: { firstName: true, lastName: true } },
} satisfies Prisma.OfferSelect;

type OfferInternal = Prisma.OfferGetPayload<{ select: typeof offerInternalSelect }>;

export type PublicOffer = Omit<OfferInternal, "company" | "author" | "authorUserId" | "priceMin" | "priceMax" | "quantity" | "commissionPct"> & {
  commissionPct: string | null;
  priceMin: string | null;
  priceMax: string | null;
  quantity: string | null;
  publisher:
    | { kind: "anonymous" }
    | { kind: "company"; slug: string; name: string; logoUrl: string | null; verified: boolean }
    | { kind: "person"; name: string };
};

/**
 * The only way offers leave the server for public pages. For anonymous offers the
 * author/company identity is dropped here — it never reaches the client payload.
 */
export function toPublicOffer(o: OfferInternal): PublicOffer {
  const { company, author, authorUserId: _authorUserId, ...rest } = o;
  void _authorUserId;
  const publisher: PublicOffer["publisher"] = o.isAnonymous
    ? { kind: "anonymous" }
    : company
      ? {
          kind: "company",
          slug: company.slug,
          name: companyName(company),
          logoUrl: company.logoUrl,
          verified: company.verificationStatus === "VERIFIED",
        }
      : { kind: "person", name: `${author.firstName} ${author.lastName.charAt(0)}.` };
  return {
    ...rest,
    priceMin: o.priceMin?.toString() ?? null,
    priceMax: o.priceMax?.toString() ?? null,
    quantity: o.quantity?.toString() ?? null,
    commissionPct: o.commissionPct?.toString() ?? null,
    publisher,
  };
}

export type OfferFilters = {
  q?: string;
  type?: "OFFER" | "REQUEST";
  category?: string;
  city?: string;
  sort?: "newest" | "validUntil";
  page?: number;
  companyId?: string;
  tag?: "MAIN_PARTNER" | "WOMEN_BUSINESS";
  pageSize?: number;
  loggedIn: boolean;
};

function liveOfferWhere(loggedIn: boolean): Prisma.OfferWhereInput {
  return {
    status: { in: [...PUBLIC_OFFER_STATUSES] },
    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    ...(loggedIn ? {} : { visibility: "PUBLIC" }),
    // Offers by a company are only public while the company itself is listed.
    AND: [{ OR: [{ companyId: null }, { company: listedCompany }] }],
  };
}

export async function searchOffers(f: OfferFilters) {
  const and: Prisma.OfferWhereInput[] = [liveOfferWhere(f.loggedIn)];
  if (f.q) {
    and.push({
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.type) and.push({ type: f.type });
  if (f.tag) and.push({ tag: f.tag });
  if (f.city) and.push({ city: { equals: f.city, mode: "insensitive" } });
  if (f.companyId) and.push({ companyId: f.companyId, isAnonymous: false });
  if (f.category) {
    const cat = await db.category.findUnique({ where: { slug: f.category }, select: { id: true, children: { select: { id: true } } } });
    and.push({ categoryId: { in: cat ? [cat.id, ...cat.children.map((c) => c.id)] : ["__none__"] } });
  }
  const where: Prisma.OfferWhereInput = { AND: and };
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    db.offer.count({ where }),
    db.offer.findMany({
      where,
      select: offerInternalSelect,
      orderBy: f.sort === "validUntil" ? [{ validUntil: { sort: "asc", nulls: "last" } }] : [{ publishedAt: "desc" }],
      skip: (page - 1) * (f.pageSize ?? PAGE_SIZE),
      take: f.pageSize ?? PAGE_SIZE,
    }),
  ]);
  return { total, items: rows.map(toPublicOffer), page, pages: Math.max(1, Math.ceil(total / (f.pageSize ?? PAGE_SIZE))) };
}

export async function getLatestOffers(limit = 6, loggedIn = false) {
  const rows = await db.offer.findMany({
    where: liveOfferWhere(loggedIn),
    select: offerInternalSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return rows.map(toPublicOffer);
}

/** Returns the public view plus the internal author id (server-side use only, never rendered). */
export async function getPublicOffer(id: string, loggedIn: boolean) {
  const row = await db.offer.findFirst({
    where: { id, AND: [liveOfferWhere(true)] },
    select: { ...offerInternalSelect, companyId: true, attachments: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, fileName: true, isImage: true } } },
  });
  if (!row) return null;
  const { companyId, attachments, ...rest } = row;
  return {
    offer: toPublicOffer(rest),
    attachments,
    restricted: !loggedIn && row.visibility === "REGISTERED",
    internal: { authorUserId: row.authorUserId, companyId },
  };
}

export async function getOfferCities() {
  const rows = await db.offer.findMany({
    where: { ...liveOfferWhere(true), city: { not: null } },
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city!).filter(Boolean);
}

// ─────────────────────────────── Global search ───────────────────────────────

/**
 * Header search across companies, offers and categories. Offers go through toPublicOffer,
 * and the company-name match is restricted to non-anonymous offers so anonymity is never revealed.
 */
export async function globalSearch(q: string, loggedIn: boolean, limit = 5) {
  const term = q.trim().slice(0, 100);
  if (term.length < 2) return { companies: [], offers: [], categories: [] };
  const like = { contains: term, mode: "insensitive" as const };

  const [companies, offerRows, categories] = await Promise.all([
    db.company.findMany({
      where: {
        AND: [
          listedCompany,
          {
            OR: [
              { legalName: like },
              { tradeName: like },
              { description: like },
              { activities: like },
              { city: like },
              { customCategory: like },
              { categories: { some: { category: { name: like } } } },
            ],
          },
        ],
      },
      select: publicCompanySelect,
      orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
      take: limit,
    }),
    db.offer.findMany({
      where: {
        AND: [
          liveOfferWhere(loggedIn),
          {
            OR: [
              { title: like },
              { description: like },
              { city: like },
              { category: { name: like } },
              { isAnonymous: false, company: { OR: [{ legalName: like }, { tradeName: like }] } },
            ],
          },
        ],
      },
      select: offerInternalSelect,
      orderBy: { publishedAt: "desc" },
      take: limit,
    }),
    db.category.findMany({
      where: { isActive: true, kind: "OFFER", name: like },
      select: { name: true, slug: true, parent: { select: { name: true } } },
      orderBy: { sortOrder: "asc" },
      take: limit,
    }),
  ]);
  return { companies, offers: offerRows.map(toPublicOffer), categories };
}
