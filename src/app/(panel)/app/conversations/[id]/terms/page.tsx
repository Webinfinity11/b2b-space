import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { requireUser } from "@/lib/authz";
import { CURRENCIES } from "@/lib/currencies";
import { db } from "@/lib/db";
import { loadDealContext } from "@/lib/deals";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { DealStatusBadge, TermsSummary } from "@/components/panel/TermsCard";
import { TermsForm, type TermsDefaults } from "@/components/panel/TermsForm";

export const metadata: Metadata = { title: ka.terms.title };

export default async function TermsPage({ params }: PageProps<"/app/conversations/[id]/terms">) {
  const { id } = await params;
  await requireUser(`/app/conversations/${id}/terms`);
  const ctx = await loadDealContext(id);
  if (!ctx || !ctx.dealSide) notFound();
  const c = ctx.conversation;
  const versions = c.dealTerms?.versions ?? [];
  const current = versions[0];
  const canEdit = ctx.can("terms.manage") && current?.status !== "APPROVED_BY_BOTH";

  let defaults: TermsDefaults;
  if (current) {
    defaults = {
      currency: current.currency,
      items: current.items.map((i) => ({
        name: i.name,
        description: i.description ?? "",
        quantity: i.quantity.toString(),
        unit: i.unit,
        unitPrice: i.unitPrice.toString(),
      })),
      discountAmount: Number(current.discountAmount) ? current.discountAmount.toString() : "",
      taxRatePercent: current.taxRatePercent?.toString() ?? "",
      deliveryTerms: current.deliveryTerms ?? "",
      deliveryCost: Number(current.deliveryCost) ? current.deliveryCost.toString() : "",
      paymentTerms: current.paymentTerms ?? "",
      validUntil: current.validUntil ? current.validUntil.toISOString().slice(0, 10) : "",
      notes: current.notes ?? "",
    };
  } else {
    // Pre-fill from the original offer where possible.
    const offer = c.offer ? await db.offer.findUnique({ where: { id: c.offer.id } }) : null;
    defaults = {
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
    };
  }

  return (
    <>
      <PageHeader
        title={ka.terms.formTitle}
        text={c.subject}
        action={<Link href={`/app/conversations/${c.id}`} className="text-sm text-accent-strong hover:underline">← {ka.chat.title}</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {canEdit ? (
            <>
              <p className="mb-4 text-sm text-muted">{ka.terms.formText}</p>
              <TermsForm conversationId={c.id} defaults={defaults} currencies={CURRENCIES} />
            </>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-muted">{current?.status === "APPROVED_BY_BOTH" ? ka.terms.lockedApproved : ka.errors.forbidden}</p>
              </CardBody>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted">{ka.terms.history}</h2>
          {versions.length === 0 && <p className="text-sm text-muted">{ka.common.noData}</p>}
          {versions.map((v, i) => (
            <Card key={v.id}>
              <CardHeader
                title={`${ka.terms.version(v.versionNumber)}${i === 0 ? ` · ${ka.terms.current}` : ""}`}
                text={formatDateTime(v.createdAt)}
                action={<DealStatusBadge status={v.status} />}
              />
              <CardBody>
                <TermsSummary v={v} />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
