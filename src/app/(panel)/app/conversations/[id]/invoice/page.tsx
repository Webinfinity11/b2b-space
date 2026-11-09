import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { requireUser } from "@/lib/authz";
import { CURRENCIES } from "@/lib/currencies";
import { db } from "@/lib/db";
import { loadDealContext } from "@/lib/deals";
import { PageHeader } from "@/components/ui/Card";
import { TermsForm } from "@/components/panel/TermsForm";

export const metadata: Metadata = { title: ka.invoice.sendTitle };

/** One-step invoice: the seller fills items and sends the invoice right away. */
export default async function SendInvoicePage({ params }: PageProps<"/app/conversations/[id]/invoice">) {
  const { id } = await params;
  await requireUser(`/app/conversations/${id}/invoice`);
  const ctx = await loadDealContext(id);
  if (!ctx || ctx.dealSide !== "SELLER" || !ctx.can("invoices.manage")) notFound();
  const c = ctx.conversation;
  const offer = c.offer ? await db.offer.findUnique({ where: { id: c.offer.id } }) : null;

  return (
    <>
      <PageHeader
        title={ka.invoice.sendTitle}
        text={c.subject}
        action={<Link href={`/app/conversations/${c.id}`} className="text-sm text-accent-strong hover:underline">← {ka.chat.title}</Link>}
      />
      <p className="mb-4 max-w-3xl text-sm text-muted">{ka.invoice.sendText}</p>
      <div className="max-w-3xl">
        <TermsForm
          mode="invoice"
          conversationId={c.id}
          currencies={CURRENCIES}
          defaults={{
            currency: offer?.currency ?? "GEL",
            items: [
              {
                name: offer?.title.replace(/\s*\(დემო\)$/, "") ?? "",
                description: "",
                quantity: offer?.quantity?.toString() ?? "",
                unit: offer?.unit ?? "",
                unitPrice: offer?.priceType === "FIXED" || offer?.priceType === "FROM" ? (offer.priceMin?.toString() ?? "") : "",
              },
            ],
            discountAmount: "",
            taxRatePercent: "",
            deliveryTerms: offer?.deliveryTerms ?? "",
            deliveryCost: "",
            paymentTerms: "",
            validUntil: "",
            notes: "",
          }}
        />
      </div>
    </>
  );
}
