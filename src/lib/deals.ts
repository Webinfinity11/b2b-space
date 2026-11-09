import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { DealSide, OfferType, ParticipantSide } from "@/generated/prisma/enums";
import { ForbiddenError, getActiveMembership, type Membership } from "./authz";
import { db } from "./db";
import { hasPermission, type Permission } from "./permissions";
import { visibleConversations } from "./scope";
import { getCurrentUser } from "./session";

const D = Prisma.Decimal;

/** The author of an OFFER sells; the author of a REQUEST buys. */
export function dealSideFor(partySide: ParticipantSide, offerType: OfferType | null): DealSide {
  const authorSells = offerType !== "REQUEST";
  return (partySide === "AUTHOR") === authorSells ? "SELLER" : "BUYER";
}

export const dealInclude = {
  participants: true,
  offer: { select: { id: true, type: true, title: true, status: true } },
  dealTerms: {
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          approvals: { include: { user: { select: { firstName: true, lastName: true } } } },
          createdBy: { select: { firstName: true, lastName: true } },
          invoice: { select: { id: true, number: true } },
        },
      },
    },
  },
} satisfies Prisma.ConversationInclude;

export type DealConversation = Prisma.ConversationGetPayload<{ include: typeof dealInclude }>;

export type DealContext = {
  userId: string;
  membership: Membership | null;
  conversation: DealConversation;
  partySide: ParticipantSide | null;
  dealSide: DealSide | null;
  /** Company the user acts for in this conversation (null = personally). */
  actingCompanyId: string | null;
  can: (permission: Permission) => boolean;
};

/**
 * Loads a conversation with its deal terms and resolves which side the viewer is on.
 * Returns null when the viewer has no access at all.
 */
export async function loadDealContext(conversationId: string): Promise<DealContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership = await getActiveMembership(user.id);
  const conversation = await db.conversation.findFirst({
    where: { AND: [{ id: conversationId }, visibleConversations(user.id, membership)] },
    include: dealInclude,
  });
  if (!conversation) return null;

  const own = conversation.participants.find((p) => p.userId === user.id);
  const viaCompany = conversation.participants.find((p) => p.companyId && p.companyId === membership?.companyId);
  const party = own ?? viaCompany ?? null;
  const actingCompanyId = party?.companyId ?? null;
  const partySide = party?.side ?? null;
  const dealSide = partySide ? dealSideFor(partySide, conversation.offer?.type ?? null) : null;

  // Acting for a company needs that company's permission; acting personally needs nothing extra.
  const can = (permission: Permission) => {
    if (!party) return false;
    if (!actingCompanyId) return true;
    return Boolean(membership && membership.companyId === actingCompanyId && hasPermission(membership, permission));
  };
  return { userId: user.id, membership, conversation, partySide, dealSide, actingCompanyId, can };
}

export async function requireDealContext(conversationId: string, permission: Permission) {
  const ctx = await loadDealContext(conversationId);
  if (!ctx || !ctx.dealSide || !ctx.can(permission)) throw new ForbiddenError();
  return ctx as DealContext & { dealSide: DealSide };
}

// ─────────────────────────────── Money ───────────────────────────────

export type ItemInput = { name: string; description: string | null; quantity: string; unit: string; unitPrice: string };

/** Exact decimal totals. lineTotal = qty × price (2dp); tax applies after discount. */
export function computeTotals(items: ItemInput[], discount: string, taxRatePercent: string | null, deliveryCost: string) {
  const lines = items.map((i) => ({ ...i, lineTotal: new D(i.quantity).mul(i.unitPrice).toDecimalPlaces(2) }));
  const subtotal = lines.reduce((s, l) => s.add(l.lineTotal), new D(0));
  const disc = new D(discount || 0);
  const taxBase = subtotal.sub(disc);
  const taxAmount = taxRatePercent ? taxBase.mul(taxRatePercent).div(100).toDecimalPlaces(2) : new D(0);
  const total = taxBase.add(taxAmount).add(deliveryCost || 0).toDecimalPlaces(2);
  return { lines, subtotal, discount: disc, taxAmount, total };
}

/** Users to notify on the other side of a deal. */
export function otherSideUserIds(c: DealConversation, mySide: DealSide, userId: string) {
  return c.participants.filter((p) => dealSideFor(p.side, c.offer?.type ?? null) !== mySide && p.userId !== userId).map((p) => p.userId);
}
