import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { ka } from "@/i18n/ka";
import { attachInvoiceDocumentAction, cancelInvoiceAction, confirmByBuyerAction, markInvoiceSentAction, markInvoiceViewed, markPaidInFullAction, recordPaymentAction } from "@/actions/invoices";
import { hasPermission } from "@/lib/permissions";
import { todayInGeorgia } from "@/lib/money";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { CORRECTABLE, canManageInvoice, effectiveStatus, type InvoiceParty, type InvoiceSnapshot } from "@/lib/invoices";
import { visibleInvoices } from "@/lib/scope";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/Form";
import { InvoiceStatusBadge } from "@/components/panel/InvoiceStatusBadge";

export const metadata: Metadata = { title: ka.invoice.invoiceWord };

export default async function InvoicePage({ params }: PageProps<"/app/invoices/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/app/invoices/${id}`);
  const m = await getActiveMembership(user.id);
  const exists = await db.invoice.findFirst({ where: { AND: [{ id }, visibleInvoices(user.id, m)] }, select: { id: true } });
  if (!exists) notFound();
  await markInvoiceViewed(id);
  const inv = await db.invoice.findUniqueOrThrow({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" }, include: { recordedBy: { select: { firstName: true, lastName: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
      correctsInvoice: { select: { id: true, number: true } },
      corrections: { select: { id: true, number: true }, orderBy: { createdAt: "desc" } },
    },
  });
  const snap = inv.snapshot as unknown as InvoiceSnapshot;
  const manager = canManageInvoice(inv, user.id, m);
  const buyerManager = inv.buyerCompanyId ? inv.buyerCompanyId === m?.companyId && hasPermission(m, "invoices.manage") : inv.buyerUserId === user.id;
  const shown = effectiveStatus(inv) as InvoiceStatus;
  const remaining = Number(inv.total) - Number(inv.paidAmount);
  const i = ka.invoice;
  const t = ka.terms;
  const today = todayInGeorgia();

  return (
    <>
      <PageHeader
        title={`${i.invoiceWord} ${inv.number}`}
        text={i.basedOn(snap.deal.versionNumber)}
        action={
          <>
            <InvoiceStatusBadge status={shown} />
            <ButtonLink href={`/api/invoices/${inv.id}/pdf`} target="_blank" variant="secondary">{i.viewPdf}</ButtonLink>
            <ButtonLink href={`/api/invoices/${inv.id}/pdf?download=1`}>{i.download}</ButtonLink>
          </>
        }
      />
      {(inv.correctsInvoice || inv.corrections.length > 0) && (
        <div className="mb-4 space-y-1 rounded-lg border border-accent/50 bg-accent/10 px-4 py-3 text-sm">
          {inv.correctsInvoice && (
            <p>{i.correctsLabel} <Link href={`/app/invoices/${inv.correctsInvoice.id}`} className="font-medium text-accent-strong hover:underline">{inv.correctsInvoice.number}</Link></p>
          )}
          {inv.corrections.map((c) => (
            <p key={c.id}>{i.correctedByLabel} <Link href={`/app/invoices/${c.id}`} className="font-medium text-accent-strong hover:underline">{c.number}</Link></p>
          ))}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Party title={i.seller} p={snap.seller} />
                <Party title={i.buyer} p={snap.buyer} />
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <Meta label={i.issuedAt} value={formatDate(inv.issuedAt)} />
                <Meta label={i.dueDate} value={inv.dueDate ? formatDate(inv.dueDate) : ka.common.none} />
                <Meta label={i.dealRef} value={<Link href={`/app/conversations/${snap.deal.conversationId}`} className="text-accent-strong hover:underline">{t.version(snap.deal.versionNumber)}</Link>} />
              </dl>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 font-medium">{t.itemName}</th>
                      <th className="py-2 text-right font-medium">{t.quantity}</th>
                      <th className="py-2 text-right font-medium">{t.unitPrice}</th>
                      <th className="py-2 text-right font-medium">{t.lineTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line tabular-nums">
                    {inv.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2">
                          <div className="font-medium">{it.name}</div>
                          {it.description && <div className="text-xs text-muted">{it.description}</div>}
                        </td>
                        <td className="py-2 text-right">{formatNumber(it.quantity)} {it.unit}</td>
                        <td className="py-2 text-right">{formatMoney(it.unitPrice, inv.currency)}</td>
                        <td className="py-2 text-right">{formatMoney(it.lineTotal, inv.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="ml-auto max-w-xs space-y-1.5 text-sm tabular-nums">
                <Row label={t.subtotal} value={formatMoney(inv.subtotal, inv.currency)} />
                {Number(inv.discountAmount) > 0 && <Row label={t.discount} value={`− ${formatMoney(inv.discountAmount, inv.currency)}`} />}
                {Number(inv.taxAmount) > 0 && <Row label={`${t.tax}${snap.taxRatePercent ? ` (${snap.taxRatePercent}%)` : ""}`} value={formatMoney(inv.taxAmount, inv.currency)} />}
                {Number(inv.deliveryCost) > 0 && <Row label={t.deliveryCost} value={formatMoney(inv.deliveryCost, inv.currency)} />}
                <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                  <dt>{t.total}</dt>
                  <dd className="text-accent-strong">{formatMoney(inv.total, inv.currency)}</dd>
                </div>
                <Row label={i.paid} value={formatMoney(inv.paidAmount, inv.currency)} />
                <Row label={i.due} value={formatMoney(Math.max(0, remaining), inv.currency)} />
              </dl>
              {(inv.paymentTerms || snap.deliveryTerms || inv.notes) && (
                <dl className="space-y-3 border-t border-line pt-4 text-sm">
                  {inv.paymentTerms && <Meta label={t.paymentTerms} value={inv.paymentTerms} />}
                  {snap.deliveryTerms && <Meta label={t.deliveryTerms} value={snap.deliveryTerms} />}
                  {inv.notes && <Meta label={t.notes} value={inv.notes} />}
                </dl>
              )}
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
                      <span className={p.voidedAt ? "text-muted line-through" : ""} title={p.voidReason ?? undefined}>
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
          {/* SGBA settlement: seller attaches the signed invoice/contract, buyer confirms. */}
          <Card>
            <CardHeader title={i.documentTitle} text={manager ? i.documentHint : undefined} />
            <CardBody className="space-y-3 text-sm">
              {inv.documentKey ? (
                <a href={`/api/invoices/${inv.id}/document`} target="_blank" className="inline-flex items-center gap-1.5 font-medium text-accent-strong hover:underline">📎 {inv.documentName}</a>
              ) : (
                !manager && <p className="text-muted">{i.documentNone}</p>
              )}
              {manager && !["CANCELLED", "REFUNDED"].includes(inv.status) && (
                <ActionForm action={attachInvoiceDocumentAction} resetOnSuccess className="space-y-2">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <Field label={inv.documentKey ? i.documentReplace : i.documentUpload} name="document">
                    <Input name="document" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="pt-1.5 text-xs" />
                  </Field>
                  <SubmitButton size="sm" variant="secondary">{i.documentUpload}</SubmitButton>
                </ActionForm>
              )}
            </CardBody>
          </Card>
          {!["CANCELLED", "REFUNDED", "DRAFT"].includes(inv.status) && (
            <Card>
              <CardHeader title={i.buyerConfirmTitle} />
              <CardBody className="space-y-3 text-sm">
                {inv.buyerConfirmedAt ? (
                  <p className="font-medium text-success">✓ {i.buyerConfirmedAt(formatDateTime(inv.buyerConfirmedAt))}</p>
                ) : buyerManager ? (
                  <ActionForm action={confirmByBuyerAction} className="space-y-3">
                    <input type="hidden" name="invoiceId" value={inv.id} />
                    <p className="text-secondary">{i.buyerConfirmText}</p>
                    <SubmitButton className="w-full">{i.buyerConfirmButton}</SubmitButton>
                  </ActionForm>
                ) : (
                  <p className="text-muted">{i.buyerConfirmedWaiting}</p>
                )}
              </CardBody>
            </Card>
          )}
          {manager && !["CANCELLED", "REFUNDED", "PAID"].includes(inv.status) && (
            <Card>
              <CardHeader title={i.recordPayment} text={i.paymentHint} />
              <CardBody className="space-y-4">
                {remaining > 0 && (
                  <ActionForm action={markPaidInFullAction}>
                    <input type="hidden" name="invoiceId" value={inv.id} />
                    <SubmitButton className="w-full">{i.paidInFull(formatMoney(remaining, inv.currency))}</SubmitButton>
                  </ActionForm>
                )}
                <details className="rounded-lg border border-line">
                <summary className="cursor-pointer px-3 py-2 text-sm">{i.partialPayment}</summary>
                <ActionForm action={recordPaymentAction} className="space-y-3 border-t border-line p-3" resetOnSuccess>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <Field label={`${i.amount} (${inv.currency})`} name="amount">
                    <Input name="amount" inputMode="decimal" defaultValue={remaining > 0 ? remaining.toFixed(2) : ""} />
                  </Field>
                  <Field label={i.paidAt} name="paidAt">
                    <Input name="paidAt" type="date" defaultValue={today} max={today} />
                  </Field>
                  <Field label={i.method} name="method" optional>
                    <Input name="method" placeholder={i.methodPlaceholder} maxLength={100} />
                  </Field>
                  <Field label={i.reference} name="reference" optional>
                    <Input name="reference" maxLength={200} />
                  </Field>
                  <SubmitButton variant="secondary" className="w-full">{i.recordPayment}</SubmitButton>
                </ActionForm>
                </details>
                {inv.status === "ISSUED" && (
                  <ActionForm action={markInvoiceSentAction}>
                    <input type="hidden" name="invoiceId" value={inv.id} />
                    <SubmitButton variant="secondary" className="w-full">{i.markSent}</SubmitButton>
                  </ActionForm>
                )}
                {CORRECTABLE.includes(inv.status) && (
                  <ButtonLink href={`/app/invoices/${inv.id}/correct`} variant="secondary" className="w-full">{i.correct}</ButtonLink>
                )}
                {["ISSUED", "SENT", "VIEWED"].includes(inv.status) && (
                  <details className="rounded-lg border border-line">
                    <summary className="cursor-pointer px-3 py-2 text-sm text-danger">{i.cancelInvoice}</summary>
                    <ActionForm action={cancelInvoiceAction} className="space-y-2 border-t border-line p-3">
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <Field label={i.cancelReason} name="reason">
                        <Textarea name="reason" rows={2} maxLength={1000} />
                      </Field>
                      <SubmitButton variant="danger" size="sm">{i.cancelInvoice}</SubmitButton>
                    </ActionForm>
                  </details>
                )}
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
  const i = ka.invoice;
  return (
    <div className="text-sm">
      <div className="mb-1 text-xs font-semibold text-accent-strong">{title}</div>
      <div className="font-semibold">{p.legalName ?? p.name}</div>
      {p.kind === "person" && <div className="text-muted">{i.person}</div>}
      {p.registrationNumber && <div className="text-muted">{i.regNumber}: {p.registrationNumber}</div>}
      {p.taxNumber && <div className="text-muted">{i.taxNumber}: {p.taxNumber}</div>}
      {p.address && <div className="text-muted">{p.address}</div>}
      {(p.email || p.phone) && <div className="text-muted">{[p.email, p.phone].filter(Boolean).join(" · ")}</div>}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
