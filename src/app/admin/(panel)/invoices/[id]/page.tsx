import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { ka } from "@/i18n/ka";
import { adminInvoiceStatusAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { effectiveStatus, type InvoiceParty, type InvoiceSnapshot } from "@/lib/invoices";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Select, SubmitButton, Textarea } from "@/components/ui/Form";
import { InvoiceStatusBadge } from "@/components/panel/InvoiceStatusBadge";

export const metadata: Metadata = { title: ka.invoice.invoiceWord };

export default async function AdminInvoicePage({ params }: PageProps<"/admin/invoices/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const inv = await db.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" }, include: { recordedBy: { select: { firstName: true, lastName: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
      correctsInvoice: { select: { id: true, number: true } },
      corrections: { select: { id: true, number: true } },
    },
  });
  if (!inv) notFound();
  const snap = inv.snapshot as unknown as InvoiceSnapshot;
  const i = ka.invoice;
  const t = ka.terms;
  const options = [
    ...(["ISSUED", "SENT", "VIEWED"].includes(inv.status) ? [{ value: "CANCELLED", label: ka.enums.invoiceStatus.CANCELLED }] : []),
    ...(["PAID", "PARTIALLY_PAID"].includes(inv.status) ? [{ value: "REFUNDED", label: ka.enums.invoiceStatus.REFUNDED }] : []),
  ];

  return (
    <>
      <PageHeader
        title={`${i.invoiceWord} ${inv.number}`}
        text={`${snap.seller.name} → ${snap.buyer.name}`}
        action={
          <>
            <InvoiceStatusBadge status={effectiveStatus(inv) as InvoiceStatus} />
            <ButtonLink href={`/api/invoices/${inv.id}/pdf`} target="_blank" variant="secondary">{i.viewPdf}</ButtonLink>
            <ButtonLink href={`/admin/conversations/${snap.deal.conversationId}`} variant="secondary">{ka.admin.openConversation}</ButtonLink>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-5">
              <div className="grid gap-6 sm:grid-cols-2">
                <Party title={i.seller} p={snap.seller} />
                <Party title={i.buyer} p={snap.buyer} />
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <Meta label={i.issuedAt} value={formatDate(inv.issuedAt)} />
                <Meta label={i.dueDate} value={inv.dueDate ? formatDate(inv.dueDate) : ka.common.none} />
                <Meta label={i.dealRef} value={t.version(snap.deal.versionNumber)} />
              </dl>
              {inv.correctsInvoice && (
                <p className="text-sm">
                  {i.correctsLabel}{" "}
                  <Link href={`/admin/invoices/${inv.correctsInvoice.id}`} className="font-medium text-accent-strong hover:underline">{inv.correctsInvoice.number}</Link>
                </p>
              )}
              {inv.corrections.map((c) => (
                <p key={c.id} className="text-sm">
                  {i.correctedByLabel}{" "}
                  <Link href={`/admin/invoices/${c.id}`} className="font-medium text-accent-strong hover:underline">{c.number}</Link>
                </p>
              ))}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 font-medium">{t.itemName}</th>
                      <th className="py-2 text-right font-medium">{t.quantity}</th>
                      <th className="py-2 text-right font-medium">{t.unitPrice}</th>
                      <th className="py-2 text-right font-medium">{t.lineTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {inv.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 font-medium">{it.name}</td>
                        <td className="py-2 text-right">{formatNumber(it.quantity)} {it.unit}</td>
                        <td className="py-2 text-right">{formatMoney(it.unitPrice, inv.currency)}</td>
                        <td className="py-2 text-right">{formatMoney(it.lineTotal, inv.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="ml-auto max-w-xs space-y-1.5 text-sm tabular-nums">
                <Row label={t.total} value={formatMoney(inv.total, inv.currency)} strong />
                <Row label={i.paid} value={formatMoney(inv.paidAmount, inv.currency)} />
                <Row label={i.due} value={formatMoney(Math.max(0, Number(inv.total) - Number(inv.paidAmount)), inv.currency)} />
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={i.payments} />
            <CardBody>
              {inv.payments.length === 0 ? (
                <p className="text-sm text-muted">{i.noPayments}</p>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {inv.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        <span className="font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                        <span className="text-muted"> · {formatDate(p.paidAt)}{p.method ? ` · ${p.method}` : ""}{p.reference ? ` · ${p.reference}` : ""}</span>
                      </span>
                      <span className="text-xs text-muted">{p.recordedBy.firstName} {p.recordedBy.lastName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
        <aside className="space-y-6">
          {options.length > 0 && (
            <Card>
              <CardHeader title={ka.admin.invoiceManage} text={ka.admin.invoiceManageText} />
              <CardBody>
                <ActionForm action={adminInvoiceStatusAction} className="space-y-3">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <Field label={ka.admin.newStatus} name="status">
                    <Select name="status" options={options} />
                  </Field>
                  <Field label={ka.admin.reason} name="comment">
                    <Textarea name="comment" rows={3} maxLength={1000} />
                  </Field>
                  <SubmitButton variant="danger" className="w-full">{ka.common.save}</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={i.statusHistory} />
            <CardBody>
              <ol className="space-y-3 text-sm">
                {inv.statusHistory.map((h) => (
                  <li key={h.id} className="border-l-2 border-accent pl-3">
                    <InvoiceStatusBadge status={h.toStatus} />
                    <p className="mt-1 text-xs text-muted">{formatDateTime(h.createdAt)} · {h.changedBy.firstName} {h.changedBy.lastName}</p>
                    {h.comment && <p className="mt-1 text-xs">{h.comment}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Party({ title, p }: { title: string; p: InvoiceParty }) {
  return (
    <div className="text-sm">
      <div className="mb-1 text-xs font-semibold text-accent-strong">{title}</div>
      <div className="font-semibold">{p.legalName ?? p.name}</div>
      {p.kind === "person" && <div className="text-muted">{ka.invoice.person}</div>}
      {p.registrationNumber && <div className="text-muted">{ka.invoice.regNumber}: {p.registrationNumber}</div>}
      {(p.email || p.phone) && <div className="text-muted">{[p.email, p.phone].filter(Boolean).join(" · ")}</div>}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-b border-line pb-1.5 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
