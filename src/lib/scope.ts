import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Membership } from "./authz";
import { hasPermission } from "./permissions";

/**
 * Record-level access scopes for the participant panel. Every list/detail query in
 * /app and /company is filtered through one of these — never by UI alone.
 */

/** Offers the user may manage: own personal ones + the active company's (with offers.manage). */
export function manageableOffers(userId: string, m: Membership | null): Prisma.OfferWhereInput {
  const or: Prisma.OfferWhereInput[] = [{ authorUserId: userId, companyId: null }];
  if (m && hasPermission(m, "offers.manage")) or.push({ companyId: m.companyId });
  return { OR: or };
}

/** Conversations the user may read: where they participate, or the company's (with responses.manage). */
export function visibleConversations(userId: string, m: Membership | null): Prisma.ConversationWhereInput {
  const or: Prisma.ConversationWhereInput[] = [{ participants: { some: { userId } } }];
  if (m && hasPermission(m, "responses.manage")) or.push({ participants: { some: { companyId: m.companyId } } });
  return { OR: or };
}

/** Invoices where the user or the active company (with invoices.view) is a party. */
export function visibleInvoices(userId: string, m: Membership | null): Prisma.InvoiceWhereInput {
  const or: Prisma.InvoiceWhereInput[] = [
    { sellerUserId: userId, sellerCompanyId: null },
    { buyerUserId: userId, buyerCompanyId: null },
  ];
  if (m && hasPermission(m, "invoices.view")) or.push({ sellerCompanyId: m.companyId }, { buyerCompanyId: m.companyId });
  return { OR: or };
}

/** Which side of an invoice the viewer is on. */
export function invoiceSide(inv: { sellerUserId: string; sellerCompanyId: string | null }, userId: string, m: Membership | null) {
  if (inv.sellerCompanyId ? inv.sellerCompanyId === m?.companyId : inv.sellerUserId === userId) return "seller" as const;
  return "buyer" as const;
}
