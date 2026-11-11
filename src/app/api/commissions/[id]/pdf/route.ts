import { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { getMemberships } from "@/lib/authz";
import { db } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import type { InvoiceParty, InvoiceSnapshot } from "@/lib/invoices";
import { hasPermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { getPublicSettings } from "@/lib/settings";

/**
 * SGBA commission invoice (settlement step 4) — issued by the platform to the seller.
 * Visible to the seller's owners / finance people (or the person seller) and to admins.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/commissions/[id]/pdf">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const c = await db.commission.findUnique({
    where: { id },
    include: { invoice: { select: { number: true, snapshot: true, sellerUserId: true, sellerCompanyId: true } } },
  });
  if (!c || !c.number) return new Response("Not found", { status: 404 });
  const isAdmin = user.platformRole === "ADMIN";
  const member = c.companyId ? (await getMemberships(user.id)).find((m) => m.companyId === c.companyId) : null;
  const allowed = isAdmin || (c.companyId ? Boolean(member && hasPermission(member, "finance.view")) : c.invoice.sellerUserId === user.id);
  if (!allowed) return new Response("Not found", { status: 404 });

  const s = await getPublicSettings();
  const platform: InvoiceParty = {
    kind: "company",
    name: ka.brand,
    legalName: s.platformLegalName ?? ka.brand,
    registrationNumber: s.platformRegNumber,
    taxNumber: null,
    address: s.platformAddress,
    email: s.contactEmail,
    phone: s.contactPhone,
  };
  const deal = c.invoice.snapshot as unknown as InvoiceSnapshot;
  const issuedAt = c.createdAt;
  const due = new Date(issuedAt.getTime() + (s.commissionDueDays ?? 10) * 864e5);
  const zero = new Prisma.Decimal(0);
  const f = ka.finance;
  const pdf = await renderInvoicePdf({
    title: f.commissionInvoiceTitle,
    number: c.number,
    issuedAt,
    dueDate: due,
    currency: c.currency,
    subtotal: c.amount,
    discountAmount: zero,
    taxAmount: zero,
    deliveryCost: zero,
    total: c.amount,
    paidAmount: c.status === "SETTLED" ? c.amount : zero,
    paymentTerms: s.platformIban ? f.commissionIban(s.platformIban) : null,
    notes: c.note,
    status: c.status === "SETTLED" ? "PAID" : c.status === "CANCELLED" ? "CANCELLED" : "ISSUED",
    snapshot: { ...deal, seller: platform, buyer: deal.seller, deliveryTerms: null, taxRatePercent: null },
    dealRefText: f.commissionRef(c.invoice.number),
    items: [
      {
        name: f.commissionLine(c.invoice.number, c.pct.toString()),
        description: f.commissionBase(c.baseAmount.toFixed(2), c.currency),
        quantity: new Prisma.Decimal(1),
        unit: "",
        unitPrice: c.amount,
        lineTotal: c.amount,
      },
    ],
  });
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${c.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
