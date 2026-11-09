/* eslint-disable @next/next/no-img-element -- user uploads */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { respondToOfferAction } from "@/actions/offers";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { offerPriceLabel, quantityLabel } from "@/lib/offer-format";
import { getPublicOffer } from "@/lib/public";
import { actingIdentities } from "@/lib/publishers";
import { getCurrentUser } from "@/lib/session";
import { Badge, VerifiedMark } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionForm, Field, Select, SubmitButton, Textarea } from "@/components/ui/Form";
import { CompanyLogo } from "@/components/site/CompanyLogo";

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

  return (
    <div className="mx-auto max-w-site px-4 py-8 sm:px-6 md:py-12">
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
          <Card>
            <CardBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={isRequest ? "warning" : "info"}>{isRequest ? ka.offer.typeRequest : ka.offer.typeOffer}</Badge>
                <Badge>{ka.enums.itemKind[offer.itemKind]}</Badge>
                {offer.publishedAt && <span className="text-xs text-muted">{ka.offer.publishedAt}: {formatDate(offer.publishedAt)}</span>}
              </div>
              <h1 className="text-2xl font-semibold md:text-3xl">{offer.title}</h1>
              {restricted ? (
                <p className="rounded-lg bg-canvas px-4 py-3 text-sm text-muted">{ka.offer.registeredOnly}</p>
              ) : (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-muted">{ka.offer.description}</h2>
                  <p className="whitespace-pre-line leading-relaxed">{offer.description}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {!restricted && attachments.length > 0 && (
            <Card>
              <CardHeader title={ka.offer.attachments} />
              <CardBody className="grid gap-3 sm:grid-cols-2">
                {attachments.map((a) =>
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

        <aside className="space-y-6">
          <Card>
            <CardBody className="space-y-4 text-sm">
              <Info label={ka.offer.price}><span className="text-lg font-semibold text-accent-strong">{offerPriceLabel(offer)}</span></Info>
              <Info label={ka.offer.quantity}>{quantityLabel(offer.quantity, offer.unit)}</Info>
              {offer.deliveryTerms && !restricted && <Info label={ka.offer.delivery}><span className="whitespace-pre-line">{offer.deliveryTerms}</span></Info>}
              <Info label={ka.offer.location}>{offer.city ?? ka.offer.notSpecified}</Info>
              <Info label={ka.offer.validUntil}>{offer.validUntil ? formatDate(offer.validUntil) : ka.offer.notSpecified}</Info>
              <Info label={ka.offer.author}>
                {offer.publisher.kind === "anonymous" ? (
                  <span>
                    <Badge tone="navy">{ka.offer.anonymous}</Badge>
                    <span className="mt-1 block text-xs text-muted">{ka.offer.anonymousHint}</span>
                  </span>
                ) : offer.publisher.kind === "company" ? (
                  <Link href={`/companies/${offer.publisher.slug}`} className="flex items-center gap-3 hover:underline">
                    <CompanyLogo name={offer.publisher.name} url={offer.publisher.logoUrl} size={36} />
                    <span>
                      <span className="block font-medium">{offer.publisher.name}</span>
                      {offer.publisher.verified && <VerifiedMark label={ka.company.verified} />}
                    </span>
                  </Link>
                ) : (
                  offer.publisher.name
                )}
              </Info>
            </CardBody>
          </Card>

          <Card>
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
        </aside>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}
