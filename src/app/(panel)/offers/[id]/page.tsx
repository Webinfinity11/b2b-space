/* eslint-disable @next/next/no-img-element -- user uploads */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { ReportButton } from "@/components/panel/ReportButton";
import { respondToOfferAction } from "@/actions/offers";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { offerPriceLabel, quantityLabel } from "@/lib/offer-format";
import { getPublicOffer, searchOffers } from "@/lib/public";
import { actingIdentities } from "@/lib/publishers";
import { getCurrentUser } from "@/lib/session";
import { Badge, VerifiedMark } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionForm, Field, Select, SubmitButton, Textarea } from "@/components/ui/Form";
import { CompanyLogo } from "@/components/site/CompanyLogo";
import { OfferCard } from "@/components/site/OfferCard";
import { Icon } from "@/components/ui/Icon";

export async function generateMetadata({ params }: PageProps<"/offers/[id]">): Promise<Metadata> {
  const data = await getPublicOffer((await params).id, false);
  return data ? { title: data.offer.title } : {};
}

export default async function OfferPage({ params }: PageProps<"/offers/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await getPublicOffer(id, Boolean(user));
  if (!data) notFound();
  const { offer, attachments, restricted, internal } = data;
  const isRequest = offer.type === "REQUEST";
  const target = await db.offer.findUnique({ where: { id }, select: { allSectors: true, targetIndustryIds: true } });
  const sectorNames = target?.targetIndustryIds.length
    ? (await db.category.findMany({ where: { id: { in: target.targetIndustryIds } }, orderBy: { sortOrder: "asc" }, select: { name: true } })).map((c) => c.name)
    : [];

  // Respond-state is computed server-side from internal ids, which are never rendered.
  let respondState: "guest" | "own" | "responded" | "can" = "guest";
  let conversationId: string | null = null;
  let identities: { value: string; label: string }[] = [];
  if (user) {
    const ownCompany = internal.companyId
      ? await db.companyMember.count({ where: { companyId: internal.companyId, userId: user.id, status: "ACTIVE" } })
      : 0;
    if (internal.authorUserId === user.id || ownCompany > 0) respondState = "own";
    else {
      const existing = await db.offerResponse.findFirst({
        where: { offerId: id, responderUserId: user.id, status: { not: "WITHDRAWN" } },
        select: { conversation: { select: { id: true } } },
      });
      if (existing) {
        respondState = "responded";
        conversationId = existing.conversation?.id ?? null;
      } else {
        respondState = "can";
        identities = await actingIdentities(user.id, "responses.manage");
      }
    }
  }

  const pub = offer.publisher;
  const fromCompany = pub.kind === "company" && internal.companyId;
  const related = (
    fromCompany
      ? await searchOffers({ companyId: internal.companyId!, loggedIn: Boolean(user), page: 1 })
      : offer.category
        ? await searchOffers({ category: offer.category.slug, loggedIn: Boolean(user), page: 1 })
        : { items: [] }
  ).items
    .filter((o) => o.id !== offer.id)
    .slice(0, 4);
  const images = restricted ? [] : attachments.filter((a) => a.isImage);
  const files = restricted ? [] : attachments.filter((a) => !a.isImage);
  const cover = images[0];
  const showCta = respondState === "can" || respondState === "guest";

  return (
    <div className={showCta ? "pb-20 lg:pb-0" : ""}>
      {pub.kind === "company" && (
        <Link href={`/companies/${pub.slug}`} className="mb-3 inline-flex items-center gap-2 text-sm text-accent-strong hover:underline">
          <span aria-hidden="true">←</span> {pub.name}
        </Link>
      )}
      <nav className="mb-4 text-sm text-muted">
        <Link href="/offers" className="hover:text-ink">{ka.nav.offers}</Link>
        {offer.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/offers?category=${offer.category.slug}`} className="hover:text-ink">{offer.category.name}</Link>
          </>
        )}
      </nav>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            {cover && (
              <a href={cover.url} target="_blank" className="block">
                <img src={cover.url} alt={cover.fileName} className="aspect-[16/8] w-full object-cover" />
              </a>
            )}
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={isRequest ? "warning" : "info"}>{isRequest ? ka.offer.typeRequest : ka.offer.typeOffer}</Badge>
                <Badge>{ka.enums.itemKind[offer.itemKind]}</Badge>
                {offer.publishedAt && <span className="text-xs text-muted">{ka.offer.publishedAt}: {formatDate(offer.publishedAt)}</span>}
              </div>
              <h1 className="text-2xl font-semibold md:text-3xl">{offer.title}</h1>
              <dl className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
                <Fact icon="tag" label={ka.offer.price} value={<span className="text-accent-strong">{offerPriceLabel(offer)}</span>} />
                <Fact icon="box" label={ka.offer.quantity} value={quantityLabel(offer.quantity, offer.unit)} />
                <Fact icon="pin" label={ka.offer.location} value={offer.city ?? ka.offer.notSpecified} />
                <Fact icon="clock" label={ka.offer.validUntil} value={offer.validUntil ? formatDate(offer.validUntil) : ka.offer.notSpecified} />
              </dl>
              {restricted ? (
                <p className="rounded-lg bg-canvas px-4 py-3 text-sm text-muted">{ka.offer.registeredOnly}</p>
              ) : (
                <>
                  <div>
                    <h2 className="mb-2 text-sm font-semibold text-muted">{ka.offer.description}</h2>
                    <p className="whitespace-pre-line leading-relaxed">{offer.description}</p>
                  </div>
                  {(target?.allSectors || sectorNames.length > 0) && (
                    <div>
                      <h2 className="mb-2 text-sm font-semibold text-muted">{isRequest ? ka.sectors.requestTitle : ka.sectors.offerTitle}</h2>
                      <div className="flex flex-wrap gap-1.5">
                        {target?.allSectors && <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-accent">{ka.sectors.badgeAll}</span>}
                        {sectorNames.map((n) => (
                          <span key={n} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-secondary">{n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {offer.deliveryTerms && (
                    <div>
                      <h2 className="mb-2 text-sm font-semibold text-muted">{ka.offer.delivery}</h2>
                      <p className="whitespace-pre-line leading-relaxed">{offer.deliveryTerms}</p>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          {images.length + files.length > 1 && (
            <Card>
              <CardHeader title={ka.offer.attachments} />
              <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[...images.slice(1), ...files].map((a) =>
                  a.isImage ? (
                    <a key={a.id} href={a.url} target="_blank">
                      <img src={a.url} alt={a.fileName} className="aspect-video w-full rounded-lg border border-line object-cover" loading="lazy" />
                    </a>
                  ) : (
                    <a key={a.id} href={a.url} target="_blank" className="flex items-center gap-2 rounded-lg border border-line px-3 py-3 text-sm text-accent-strong hover:border-accent">
                      PDF · <span className="truncate">{a.fileName}</span>
                    </a>
                  ),
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div id="respond" className="scroll-mt-24" />
            <CardHeader title={ka.offer.respondTitle} />
            <CardBody>
              {respondState === "guest" && (
                <ButtonLink href={`/login?next=/offers/${offer.id}`} className="w-full">{ka.offer.loginToRespond}</ButtonLink>
              )}
              {respondState === "own" && <p className="text-sm text-muted">{ka.offer.ownOffer}</p>}
              {respondState === "responded" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">{ka.offer.alreadyResponded}</p>
                  {conversationId && <ButtonLink href={`/app/conversations/${conversationId}`} variant="secondary" className="w-full">{ka.offer.openConversation}</ButtonLink>}
                </div>
              )}
              {respondState === "can" && (
                <ActionForm action={respondToOfferAction} className="space-y-4">
                  <p className="text-sm text-muted">{ka.offer.respondText}</p>
                  <input type="hidden" name="offerId" value={offer.id} />
                  <Field label={ka.offer.respondAs} name="respondAs">
                    <Select name="respondAs" defaultValue={identities[identities.length - 1]?.value} options={identities} />
                  </Field>
                  <Field label={ka.offer.message} name="message">
                    <Textarea name="message" rows={5} maxLength={3000} required />
                  </Field>
                  <SubmitButton className="w-full">{ka.offer.send}</SubmitButton>
                </ActionForm>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={isRequest ? ka.offer.requestedBy : ka.offer.offeredBy} />
            <CardBody className="space-y-3 text-sm">
              {pub.kind === "anonymous" ? (
                <div>
                  <Badge tone="navy">{ka.offer.anonymous}</Badge>
                  <p className="mt-2 text-xs text-muted">{ka.offer.anonymousHint}</p>
                </div>
              ) : pub.kind === "company" ? (
                <>
                  <Link href={`/companies/${pub.slug}`} className="flex items-center gap-3">
                    <CompanyLogo name={pub.name} url={pub.logoUrl} size={48} />
                    <span className="min-w-0">
                      <span className="block font-semibold hover:underline">{pub.name}</span>
                      {pub.verified && <VerifiedMark label={ka.company.verified} />}
                    </span>
                  </Link>
                  <ButtonLink href={`/companies/${pub.slug}`} variant="secondary" className="w-full">{ka.offer.companyProfile}</ButtonLink>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-lg bg-accent/10 text-accent"><Icon name="user" /></span>
                  <span className="font-semibold">{pub.name}</span>
                </div>
              )}
              {offer.publishedAt && <p className="text-xs text-muted">{ka.offer.publishedAt}: {formatDate(offer.publishedAt)}</p>}
            </CardBody>
          </Card>
          {user && <ReportButton targetType="OFFER" targetId={offer.id} />}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{fromCompany ? ka.offer.moreFromCompany : ka.offer.similar}</h2>
            <Link
              href={pub.kind === "company" ? `/companies/${pub.slug}#offers` : `/offers?category=${offer.category?.slug ?? ""}`}
              className="text-sm text-accent-strong hover:underline"
            >
              {ka.home.viewAll}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      {showCta && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <span className="min-w-0 truncate font-semibold text-accent-strong">{offerPriceLabel(offer)}</span>
          <ButtonLink href={respondState === "guest" ? `/login?next=/offers/${offer.id}` : "#respond"}>{ka.offer.respondTitle}</ButtonLink>
        </div>
      )}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: "tag" | "box" | "pin" | "clock"; label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[11px] text-muted"><Icon name={icon} size={13} /> {label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}

