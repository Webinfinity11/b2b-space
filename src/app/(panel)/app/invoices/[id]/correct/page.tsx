import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { CURRENCIES } from "@/lib/currencies";
import { db } from "@/lib/db";
import { CORRECTABLE, canManageInvoice, type InvoiceSnapshot } from "@/lib/invoices";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, PageHeader } from "@/components/ui/Card";
import { InvoiceCorrectionForm } from "@/components/panel/InvoiceComposer";

export const metadata: Metadata = { title: ka.invoice.correct };

const plain = (d: { toString(): string } | null | undefined) => (d && Number(d.toString()) !== 0 ? d.toString() : "");

export default async function CorrectInvoicePage({ params }: PageProps<"/app/invoices/[id]/correct">) {
  const { id } = await params;
  const user = await requireUser(`/app/invoices/${id}/correct`);
  const m = await getActiveMembership(user.id);
  const inv = await db.invoice.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!inv || !canManageInvoice(inv, user.id, m)) notFound();
  const snap = inv.snapshot as unknown as InvoiceSnapshot;
  const back = <ButtonLink href={`/app/invoices/${inv.id}`} variant="secondary">{ka.common.back}</ButtonLink>;
  if (!CORRECTABLE.includes(inv.status)) {
    return (
      <>
        <PageHeader title={`${ka.invoice.correct}: ${inv.number}`} action={back} />
        <Card><CardBody><p className="text-sm text-muted">{ka.invoice.cannotCorrect}</p></CardBody></Card>
      </>
    );
  }
  return (
    <>
      <PageHeader title={`${ka.invoice.correct}: ${inv.number}`} text={ka.invoice.correctText} action={back} />
      <Card className="max-w-3xl">
        <CardBody>
          <InvoiceCorrectionForm
            conversationId={snap.deal.conversationId}
            correctsInvoiceId={inv.id}
            currencies={[...CURRENCIES]}
            initial={{
              rows: inv.items.map((it) => ({ name: it.name, quantity: it.quantity.toString(), unitPrice: it.unitPrice.toString(), unit: it.unit, description: it.description ?? "" })),
              currency: inv.currency,
              taxRatePercent: snap.taxRatePercent ?? "",
              deliveryCost: plain(inv.deliveryCost),
              discountAmount: plain(inv.discountAmount),
              deliveryTerms: snap.deliveryTerms ?? "",
              dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
              paymentTerms: inv.paymentTerms ?? "",
              notes: inv.notes ?? "",
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
