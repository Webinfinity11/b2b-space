import { audit } from "@/lib/audit";
import { getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import type { InvoiceSnapshot } from "@/lib/invoices";
import { visibleInvoices } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";

/** Invoice PDF — only for the two parties (or a platform admin, audited). */
export async function GET(req: Request, ctx: RouteContext<"/api/invoices/[id]/pdf">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const isAdmin = user.platformRole === "ADMIN";
  const m = await getActiveMembership(user.id);
  const inv = await db.invoice.findFirst({
    where: isAdmin ? { id } : { AND: [{ id }, visibleInvoices(user.id, m)] },
    include: { items: { orderBy: { sortOrder: "asc" } }, correctsInvoice: { select: { number: true } } },
  });
  if (!inv) return new Response("Not found", { status: 404 });
  if (isAdmin) await audit({ actorId: user.id, action: "invoice.pdf_viewed", entityType: "Invoice", entityId: inv.id });

  const pdf = await renderInvoicePdf({ ...inv, snapshot: inv.snapshot as unknown as InvoiceSnapshot, correctsNumber: inv.correctsInvoice?.number });
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
