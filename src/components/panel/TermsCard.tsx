import Link from "next/link";
import { ka } from "@/i18n/ka";
import type { DealStatus } from "@/generated/prisma/enums";
import { approveTermsAction, cancelTermsAction, requestChangesAction } from "@/actions/deals";
import { createInvoiceAction } from "@/actions/invoices";
import type { DealContext } from "@/lib/deals";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/Form";

const t = ka.terms;

const tone: Record<DealStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  SENT_FOR_APPROVAL: "info",
  CHANGES_REQUESTED: "warning",
  APPROVED_BY_ONE: "info",
  APPROVED_BY_BOTH: "success",
  SUPERSEDED: "neutral",
  CANCELLED: "danger",
};

export function DealStatusBadge({ status }: { status: DealStatus }) {
  return <Badge tone={tone[status]}>{ka.enums.dealStatus[status]}</Badge>;
}

type Version = NonNullable<DealContext["conversation"]["dealTerms"]>["versions"][number];

/** Read-only summary of one version (items + totals). */
export function TermsSummary({ v }: { v: Version }) {
  return (
    <div className="space-y-3 text-sm">
      <ul className="divide-y divide-line rounded-lg border border-line">
        {v.items.map((it) => (
          <li key={it.id} className="px-3 py-2">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{it.name}</span>
              <span className="tabular-nums">{formatMoney(it.lineTotal, v.currency)}</span>
            </div>
            <div className="text-xs text-muted">
              {formatNumber(it.quantity)} {it.unit} × {formatMoney(it.unitPrice, v.currency)}
            </div>
            {it.description && <div className="text-xs text-muted">{it.description}</div>}
          </li>
        ))}
      </ul>
      <dl className="space-y-1 tabular-nums">
        <Row label={t.subtotal} value={formatMoney(v.subtotal, v.currency)} />
        {Number(v.discountAmount) > 0 && <Row label={t.discount} value={`− ${formatMoney(v.discountAmount, v.currency)}`} />}
        {Number(v.taxAmount) > 0 && <Row label={`${t.tax} (${v.taxRatePercent?.toString()}%)`} value={formatMoney(v.taxAmount, v.currency)} />}
        {Number(v.deliveryCost) > 0 && <Row label={t.deliveryCost} value={formatMoney(v.deliveryCost, v.currency)} />}
        <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
          <dt>{t.total}</dt>
          <dd className="text-accent-strong">{formatMoney(v.total, v.currency)}</dd>
        </div>
      </dl>
      {(v.deliveryTerms || v.paymentTerms || v.validUntil || v.notes) && (
        <dl className="space-y-2 border-t border-line pt-3">
          {v.deliveryTerms && <Info label={t.deliveryTerms} value={v.deliveryTerms} />}
          {v.paymentTerms && <Info label={t.paymentTerms} value={v.paymentTerms} />}
          {v.validUntil && <Info label={t.validUntil} value={formatDate(v.validUntil)} />}
          {v.notes && <Info label={t.notes} value={v.notes} />}
        </dl>
      )}
      <p className="text-xs text-muted">
        {t.createdBy}: {v.createdBy.firstName} {v.createdBy.lastName}
      </p>
    </div>
  );
}

/** Sidebar card in a conversation: current terms, approvals and the actions the viewer may take. */
export function TermsCard({ ctx }: { ctx: DealContext }) {
  const c = ctx.conversation;
  const current = c.dealTerms?.versions[0];
  const canTerms = ctx.can("terms.manage");
  const editHref = `/app/conversations/${c.id}/terms`;

  if (!current) {
    return (
      <Card>
        <CardHeader title={t.title} />
        <CardBody className="space-y-3">
          <p className="text-sm text-muted">{t.none}</p>
          {canTerms && <ButtonLink href={editHref} className="w-full">{t.create}</ButtonLink>}
        </CardBody>
      </Card>
    );
  }

  const mySide = ctx.dealSide;
  const myDecision = current.approvals.find((a) => a.side === mySide);
  const open = current.status === "SENT_FOR_APPROVAL" || current.status === "APPROVED_BY_ONE";
  const agreed = current.status === "APPROVED_BY_BOTH";
  const canInvoice = agreed && mySide === "SELLER" && ctx.can("invoices.manage") && !current.invoice;

  return (
    <Card>
      <CardHeader title={t.title} text={t.version(current.versionNumber)} action={<DealStatusBadge status={current.status} />} />
      <CardBody className="space-y-4">
        <TermsSummary v={current} />

        <div className="space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="text-xs font-medium text-muted">{t.approvals}</div>
          {(["SELLER", "BUYER"] as const).map((side) => {
            const a = current.approvals.find((x) => x.side === side);
            return (
              <div key={side} className="flex items-center justify-between gap-2">
                <span>
                  {side === "SELLER" ? t.seller : t.buyer}
                  {side === mySide && <span className="text-xs text-muted"> · {t.yourSide}</span>}
                </span>
                {a ? (
                  <Badge tone={a.decision === "APPROVED" ? "success" : "warning"}>{a.decision === "APPROVED" ? t.approved : t.changesRequested}</Badge>
                ) : (
                  <Badge>{t.waiting}</Badge>
                )}
              </div>
            );
          })}
          {current.approvals
            .filter((a) => a.comment)
            .map((a) => (
              <p key={a.id} className="whitespace-pre-line rounded-lg bg-canvas px-3 py-2 text-xs">{a.comment}</p>
            ))}
        </div>

        {agreed && current.invoice && (
          <ButtonLink href={`/app/invoices/${current.invoice.id}`} variant="secondary" className="w-full">
            {ka.invoice.open}: {current.invoice.number}
          </ButtonLink>
        )}

        {canInvoice && (
          <ActionForm action={createInvoiceAction} className="space-y-3 border-t border-line pt-3">
            <input type="hidden" name="conversationId" value={c.id} />
            <input type="hidden" name="versionId" value={current.id} />
            <p className="text-xs text-muted">{ka.invoice.createText}</p>
            <Field label={ka.invoice.dueDate} name="dueDate" optional>
              <Input name="dueDate" type="date" />
            </Field>
            <SubmitButton className="w-full">{ka.invoice.create}</SubmitButton>
          </ActionForm>
        )}
        {agreed && !current.invoice && mySide === "BUYER" && <p className="text-xs text-muted">{ka.invoice.onlySeller}</p>}

        {canTerms && open && !myDecision && (
          <div className="space-y-3 border-t border-line pt-3">
            <ActionForm action={approveTermsAction}>
              <input type="hidden" name="conversationId" value={c.id} />
              <input type="hidden" name="versionId" value={current.id} />
              <SubmitButton className="w-full">{t.approve}</SubmitButton>
            </ActionForm>
            <details className="rounded-lg border border-line">
              <summary className="cursor-pointer px-3 py-2 text-sm">{t.requestChanges}</summary>
              <ActionForm action={requestChangesAction} className="space-y-2 border-t border-line p-3">
                <input type="hidden" name="conversationId" value={c.id} />
                <input type="hidden" name="versionId" value={current.id} />
                <Field label={t.changesComment} name="comment">
                  <Textarea name="comment" rows={3} maxLength={2000} />
                </Field>
                <SubmitButton variant="secondary" size="sm">{t.requestChanges}</SubmitButton>
              </ActionForm>
            </details>
          </div>
        )}

        {canTerms && !agreed && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <ButtonLink href={editHref} variant="secondary" className="w-full">{t.newVersion}</ButtonLink>
            {open && (
              <ActionForm action={cancelTermsAction}>
                <input type="hidden" name="conversationId" value={c.id} />
                <input type="hidden" name="versionId" value={current.id} />
                <SubmitButton variant="ghost" size="sm" className="w-full text-danger">{t.cancel}</SubmitButton>
              </ActionForm>
            )}
          </div>
        )}
        {agreed && <p className="text-xs text-muted">{t.lockedApproved}</p>}

        {c.dealTerms!.versions.length > 1 && (
          <Link href={editHref} className="block text-xs text-accent-strong hover:underline">{t.history} ({c.dealTerms!.versions.length}) →</Link>
        )}
      </CardBody>
    </Card>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}
