import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { deleteOfferAttachmentAction, setResponseStatusAction } from "@/actions/offers";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { companyName, getCategoryTree } from "@/lib/public";
import { manageableOffers } from "@/lib/scope";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { OfferForm } from "@/components/panel/OfferForm";
import { OfferStatusBadge, ResponseStatusBadge } from "@/components/panel/StatusBadges";

export const metadata: Metadata = { title: ka.offerForm.editTitle };

export default async function EditOfferPage({ params }: PageProps<"/company/offers/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/company/offers/${id}`);
  const m = await getActiveMembership(user.id);
  const offer = await db.offer.findFirst({
    where: { AND: [{ id }, manageableOffers(user.id, m)] },
    include: {
      company: { select: { legalName: true, tradeName: true } },
      attachments: { orderBy: { sortOrder: "asc" } },
      responses: {
        orderBy: { createdAt: "desc" },
        include: {
          responder: { select: { firstName: true, lastName: true } },
          responderCompany: { select: { legalName: true, tradeName: true } },
          conversation: { select: { id: true } },
        },
      },
    },
  });
  if (!offer) notFound();
  const categories = await getCategoryTree("OFFER");

  return (
    <>
      <PageHeader
        title={offer.title}
        text={offer.type === "REQUEST" ? ka.enums.offerType.REQUEST : ka.enums.offerType.OFFER}
        action={<OfferStatusBadge status={offer.status} />}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {offer.attachments.length > 0 && (
            <Card className="mb-6 max-w-3xl">
              <CardHeader title={ka.offer.attachments} />
              <CardBody>
                <ul className="divide-y divide-line">
                  {offer.attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <a href={a.url} target="_blank" className="truncate text-accent-strong hover:underline">{a.fileName}</a>
                      <form action={deleteOfferAttachmentAction}>
                        <input type="hidden" name="attachmentId" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.common.delete}</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
          <OfferForm
            categories={categories}
            publishAs={[]}
            lockedPublisher={offer.company ? companyName(offer.company) : ka.offer.asMyself}
            defaults={{
              id: offer.id,
              type: offer.type,
              title: offer.title,
              description: offer.description,
              categoryId: offer.categoryId,
              itemKind: offer.itemKind,
              priceType: offer.priceType,
              priceMin: offer.priceMin?.toString() ?? null,
              priceMax: offer.priceMax?.toString() ?? null,
              currency: offer.currency,
              quantity: offer.quantity?.toString() ?? null,
              unit: offer.unit,
              deliveryTerms: offer.deliveryTerms,
              perk: offer.perk,
              audience: offer.audience,
              city: offer.city,
              validUntil: offer.validUntil ? offer.validUntil.toISOString().slice(0, 10) : null,
              visibility: offer.visibility,
              isAnonymous: offer.isAnonymous,
              status: offer.status,
            }}
          />
        </div>
        <Card className="h-fit">
          <CardHeader title={ka.offerForm.responsesCount(offer.responses.length)} />
          <CardBody>
            {offer.responses.length === 0 ? (
              <p className="text-sm text-muted">{ka.responses.empty}</p>
            ) : (
              <ul className="divide-y divide-line">
                {offer.responses.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {r.responderCompany ? companyName(r.responderCompany) : `${r.responder.firstName} ${r.responder.lastName}`}
                      </span>
                      <ResponseStatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{r.message}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span>{formatDateTime(r.createdAt)}</span>
                      {r.conversation && <Link href={`/app/conversations/${r.conversation.id}`} className="text-accent-strong hover:underline">{ka.offer.openConversation}</Link>}
                    </div>
                    {(r.status === "SENT" || r.status === "VIEWED") && (
                      <div className="mt-2 flex gap-2">
                        <form action={setResponseStatusAction}>
                          <input type="hidden" name="responseId" value={r.id} />
                          <input type="hidden" name="op" value="accept" />
                          <Button type="submit" size="sm">{ka.offer.accept}</Button>
                        </form>
                        <form action={setResponseStatusAction}>
                          <input type="hidden" name="responseId" value={r.id} />
                          <input type="hidden" name="op" value="decline" />
                          <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.offer.decline}</Button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
