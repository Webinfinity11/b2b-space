import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { adminArchiveOfferAction, adminUpdateOfferAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { offerPriceLabel } from "@/lib/offer-format";
import { companyName } from "@/lib/public";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/Form";
import { OfferStatusBadge } from "@/components/panel/StatusBadges";

export const metadata: Metadata = { title: ka.sgba.offerManageTitle };

/** Admin: one place to set an offer's badge and commission. */
export default async function AdminOfferPage({ params }: PageProps<"/admin/offers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [o, badges, deals] = await Promise.all([
    db.offer.findUnique({
      where: { id },
      include: { author: { select: { firstName: true, lastName: true, email: true } }, company: { select: { legalName: true, tradeName: true } }, category: { select: { name: true } } },
    }),
    db.offerBadge.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, isActive: true } }),
    db.conversation.count({ where: { offerId: id } }),
  ]);
  if (!o) notFound();
  const s = ka.sgba;
  const price = offerPriceLabel({ ...o, priceMin: o.priceMin?.toString() ?? null, priceMax: o.priceMax?.toString() ?? null });

  return (
    <>
      <PageHeader
        eyebrow={s.offerManageTitle}
        title={o.title}
        text={`${o.company ? companyName(o.company) : `${o.author.firstName} ${o.author.lastName}`} · ${o.category?.name ?? ka.offer.notSpecified} · ${formatDate(o.createdAt)}`}
        action={<Link href="/admin/offers" className="text-sm font-medium text-accent hover:underline">← {ka.admin.offers}</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title={ka.offer.description} action={<OfferStatusBadge status={o.status} />} />
          <CardBody className="space-y-4 text-sm">
            <p className="whitespace-pre-line leading-relaxed text-secondary">{o.description}</p>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div><dt className="text-xs text-muted">{s.specialCondition}</dt><dd className="font-semibold">{o.perk || price}</dd></div>
              <div><dt className="text-xs text-muted">{s.forWhom}</dt><dd>{o.audience || "—"}</dd></div>
              <div><dt className="text-xs text-muted">{s.nav.deals}</dt><dd>{deals}</dd></div>
            </dl>
            <p className="text-xs text-muted">{o.author.email}</p>
            <Link href={`/offers/${o.id}`} target="_blank" className="inline-block font-medium text-accent hover:underline">{s.open} →</Link>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={ka.common.edit} />
            <CardBody>
              <ActionForm action={adminUpdateOfferAction} className="space-y-4" toast>
                <input type="hidden" name="offerId" value={o.id} />
                <Field label={s.offerBadge} name="badgeId" optional hint={<Link href="/admin/badges" className="text-accent hover:underline">{s.badgesTitle} →</Link>}>
                  <Select name="badgeId" defaultValue={o.badgeId ?? ""} placeholder={s.offerNoBadge} options={badges.map((b) => ({ value: b.id, label: b.isActive ? b.name : `${b.name} (${s.catInactive})` }))} />
                </Field>
                <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                  <Field label={s.offerCommission} name="commissionPct" optional>
                    <Input name="commissionPct" inputMode="decimal" defaultValue={o.commissionPct?.toString() ?? ""} placeholder="3" />
                  </Field>
                  <Field label={s.offerCommissionText} name="commissionText" optional>
                    <Input name="commissionText" defaultValue={o.commissionText ?? ""} placeholder={s.commissionFixed} maxLength={80} />
                  </Field>
                </div>
                <SubmitButton className="w-full">{ka.common.save}</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          {o.status !== "ARCHIVED" && (
            <form action={adminArchiveOfferAction}>
              <input type="hidden" name="offerId" value={o.id} />
              <Button type="submit" variant="ghost" className="w-full text-danger">{ka.admin.hideOffer}</Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
