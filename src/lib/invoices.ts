import "server-only";
import { ka } from "@/i18n/ka";
import type { DealTerms, Prisma } from "@/generated/prisma/client";
import { ForbiddenError, assertUser, type Membership } from "./authz";
import { db } from "./db";
import { hasPermission } from "./permissions";

export type InvoiceParty = {
  kind: "company" | "person";
  name: string;
  legalName: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

export type InvoiceSnapshot = {
  seller: InvoiceParty;
  buyer: InvoiceParty;
  deal: { dealTermsId: string; versionId: string; versionNumber: number; conversationId: string };
  deliveryTerms: string | null;
  taxRatePercent: string | null;
  createdAt: string;
};

type Client = Pick<Prisma.TransactionClient, "company" | "user">;

async function party(client: Client, companyId: string | null, userId: string): Promise<InvoiceParty> {
  if (companyId) {
    const c = await client.company.findUniqueOrThrow({ where: { id: companyId } });
    const country = ka.countries[c.country as keyof typeof ka.countries] ?? c.country;
    return {
      kind: "company",
      name: c.tradeName || c.legalName,
      legalName: c.legalName,
      registrationNumber: c.registrationNumber,
      taxNumber: c.taxNumber,
      address: [c.legalAddress, c.city, country].filter(Boolean).join(", "),
      email: c.contactEmail,
      phone: c.contactPhone,
    };
  }
  const u = await client.user.findUniqueOrThrow({ where: { id: userId } });
  return {
    kind: "person",
    name: `${u.firstName} ${u.lastName}`,
    legalName: null,
    registrationNumber: null,
    taxNumber: null,
    address: null,
    email: u.email,
    phone: u.phone,
  };
}

/** Frozen copy of both parties' legal data at the moment the invoice is created. */
export async function buildInvoiceSnapshot(
  deal: Pick<DealTerms, "id" | "conversationId" | "sellerCompanyId" | "sellerUserId" | "buyerCompanyId" | "buyerUserId">,
  version: { id: string; versionNumber: number; deliveryTerms: string | null; taxRatePercent: { toString(): string } | null },
  /** Pass the transaction client when called inside db.$transaction. */
  client: Client = db,
): Promise<InvoiceSnapshot> {
  return {
    seller: await party(client, deal.sellerCompanyId, deal.sellerUserId),
    buyer: await party(client, deal.buyerCompanyId, deal.buyerUserId),
    deal: { dealTermsId: deal.id, versionId: version.id, versionNumber: version.versionNumber, conversationId: deal.conversationId },
    deliveryTerms: version.deliveryTerms,
    taxRatePercent: version.taxRatePercent?.toString() ?? null,
    createdAt: new Date().toISOString(),
  };
}

type InvLike = { sellerUserId: string; sellerCompanyId: string | null; buyerUserId: string; buyerCompanyId: string | null };

/** Seller side with invoices.manage (or the personal seller) may manage the invoice. */
export function canManageInvoice(inv: InvLike, userId: string, m: Membership | null) {
  if (inv.sellerCompanyId) return m?.companyId === inv.sellerCompanyId && hasPermission(m, "invoices.manage");
  return inv.sellerUserId === userId;
}

export async function assertInvoiceManager(invoiceId: string) {
  const user = await assertUser();
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw new ForbiddenError();
  if (inv.sellerCompanyId) {
    const m = await db.companyMember.findUnique({ where: { companyId_userId: { companyId: inv.sellerCompanyId, userId: user.id } } });
    if (!m || m.status !== "ACTIVE" || !hasPermission(m, "invoices.manage")) throw new ForbiddenError();
  } else if (inv.sellerUserId !== user.id) {
    throw new ForbiddenError();
  }
  return { user, inv };
}

/** Display status: unpaid invoices past their due date show as overdue (computed, not stored). */
export function effectiveStatus<T extends { status: string; dueDate: Date | null }>(inv: T) {
  const open = ["ISSUED", "SENT", "VIEWED", "PARTIALLY_PAID"].includes(inv.status);
  return open && inv.dueDate && inv.dueDate < new Date() ? ("OVERDUE" as const) : (inv.status as T["status"]);
}

/** Unpaid, active invoices can be replaced by a correction (a new invoice; the original is cancelled). */
export const CORRECTABLE: string[] = ["ISSUED", "SENT", "VIEWED"];

export const OPEN_STATUSES = ["ISSUED", "SENT", "VIEWED", "PARTIALLY_PAID"] as const;

/** DB filter matching the *displayed* status (overdue is computed from the due date). */
export function displayStatusWhere(s: string, now = new Date()): Prisma.InvoiceWhereInput {
  if (s === "OVERDUE") return { status: { in: [...OPEN_STATUSES] }, dueDate: { lt: now } };
  if ((OPEN_STATUSES as readonly string[]).includes(s)) return { status: s as (typeof OPEN_STATUSES)[number], OR: [{ dueDate: null }, { dueDate: { gte: now } }] };
  return { status: s as Prisma.InvoiceWhereInput["status"] & string };
}

/** Users who see an invoice on one side: the personal party, or company members with invoices.view. */
export async function invoiceSideUserIds(companyId: string | null, userId: string) {
  if (!companyId) return [userId];
  const members = await db.companyMember.findMany({ where: { companyId, status: "ACTIVE" }, select: { userId: true, role: true, permissions: true } });
  return members.filter((m) => hasPermission(m, "invoices.view")).map((m) => m.userId);
}
