import Link from "next/link";
import { ka } from "@/i18n/ka";
import { changeOfferStatusAction, deleteOfferAction } from "@/actions/offers";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { offerPriceLabel } from "@/lib/offer-format";
import { companyName } from "@/lib/public";
import { manageableOffers } from "@/lib/scope";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { OfferStatusBadge } from "./StatusBadges";

/** Lists the offers or requests the current user may manage (personal + active company). */
export async function OfferList({ type, archived = false }: { type: "OFFER" | "REQUEST"; archived?: boolean }) {
  const user = await requireUser(type === "OFFER" ? "/company/offers" : "/company/requests");
  const m = await getActiveMembership(user.id);
  const offers = await db.offer.findMany({
    where: { AND: [manageableOffers(user.id, m), { type, status: archived ? "ARCHIVED" : { not: "ARCHIVED" } }] },
    orderBy: { updatedAt: "desc" },
    include: { company: { select: { legalName: true, tradeName: true } }, _count: { select: { responses: true } } },
  });
  const isOffer = type === "OFFER";
  const now = new Date();

  return (
    <>
      <PageHeader
        title={isOffer ? ka.panel.myOffers : ka.panel.myRequests}
        text={isOffer ? ka.offerForm.offersText : ka.offerForm.requestsText}
        action={<ButtonLink href={`/company/offers/new?type=${type}`}>+ {isOffer ? ka.offerForm.newOffer : ka.offerForm.newRequest}</ButtonLink>}
      />
      <div className="mb-4 inline-flex rounded-[12px] bg-surface-2 p-1">
        {[false, true].map((arch) => (
          <Link
            key={String(arch)}
            href={`${isOffer ? "/company/offers" : "/company/requests"}${arch ? "?archived=1" : ""}`}
            className={`rounded-[10px] px-4 py-1.5 text-sm font-semibold ${archived === arch ? "bg-surface text-ink shadow-[0_2px_8px_rgb(33_55_105/0.08)]" : "text-muted hover:text-ink"}`}
          >
            {arch ? ka.offerForm.tabArchived : ka.offerForm.tabActive}
          </Link>
        ))}
      </div>
      {offers.length === 0 ? (
        <EmptyState text={ka.offerForm.empty} action={<ButtonLink href={`/company/offers/new?type=${type}`} variant="secondary">{isOffer ? ka.offerForm.newOffer : ka.offerForm.newRequest}</ButtonLink>} />
      ) : (
        <Table head={[ka.offerForm.title, ka.offerForm.publishAs, ka.offer.price, ka.common.status, ka.panel.responses, ka.common.actions]}>
          {offers.map((o) => {
            const expired = o.validUntil && o.validUntil < now && o.status !== "DRAFT";
            return (
              <tr key={o.id}>
                <Td>
                  <Link href={`/company/offers/${o.id}`} className="font-medium text-accent-strong hover:underline">{o.title}</Link>
                  <div className="text-xs text-muted">
                    {o.validUntil ? `${ka.offer.validUntil}: ${formatDate(o.validUntil)}` : formatDate(o.createdAt)}
                  </div>
                </Td>
                <Td>
                  {o.company ? companyName(o.company) : ka.offer.asMyself}
                  {o.isAnonymous && <div className="mt-1"><Badge tone="navy">{ka.offer.anonymous}</Badge></div>}
                </Td>
                <Td className="whitespace-nowrap">{offerPriceLabel(o)}</Td>
                <Td>
                  {expired ? <Badge tone="warning">{ka.enums.offerStatus.EXPIRED}</Badge> : <OfferStatusBadge status={o.status} />}
                  {o.hiddenAt && <div className="mt-1 max-w-56 text-xs text-danger">{ka.offerForm.hiddenByAdmin(o.hiddenReason ?? "")}</div>}
                </Td>
                <Td className="tabular-nums">{o._count.responses}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"].includes(o.status) && !expired && (
                      <ButtonLink href={`/offers/${o.id}`} size="sm" variant="ghost" target="_blank">{ka.common.view}</ButtonLink>
                    )}
                    {(o.status === "DRAFT" || o.status === "CLOSED") && !expired && !o.hiddenAt && <StatusButton id={o.id} op="publish" label={ka.offerForm.publish} />}
                    {expired && <ButtonLink href={`/company/offers/${o.id}`} size="sm" variant="secondary">{ka.offerForm.extendValidity}</ButtonLink>}
                    {["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"].includes(o.status) && <StatusButton id={o.id} op="close" label={ka.offerForm.unpublish} />}
                    {o.status === "ARCHIVED" ? (
                      <>
                        <StatusButton id={o.id} op="restore" label={ka.offerForm.restore} />
                        {o._count.responses === 0 && (
                          <form action={deleteOfferAction} title={ka.offerForm.deleteHint}>
                            <input type="hidden" name="offerId" value={o.id} />
                            <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.offerForm.deleteForever}</Button>
                          </form>
                        )}
                      </>
                    ) : (
                      <StatusButton id={o.id} op="archive" label={ka.offerForm.archive} />
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}

function StatusButton({ id, op, label }: { id: string; op: string; label: string }) {
  return (
    <form action={changeOfferStatusAction}>
      <input type="hidden" name="offerId" value={id} />
      <input type="hidden" name="op" value={op} />
      <Button type="submit" size="sm" variant="secondary">{label}</Button>
    </form>
  );
}
