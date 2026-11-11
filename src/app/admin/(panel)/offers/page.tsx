import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { adminArchiveOfferAction, adminRestoreOfferAction } from "@/actions/admin";
import { controlClass } from "@/components/ui/styles";
import { BADGE_STYLE } from "@/components/panel/badge-style";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { pageParam, param } from "@/lib/params";
import { companyName } from "@/lib/public";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { FilterLinks, Table, Td } from "@/components/ui/Table";
import { OfferStatusBadge } from "@/components/panel/StatusBadges";

export const metadata: Metadata = { title: ka.admin.offers };

const PER_PAGE = 25;

export default async function AdminOffersPage({ searchParams }: PageProps<"/admin/offers">) {
  await requireAdmin();
  const sp = await searchParams;
  const t = param(sp.type);
  const type = t === "OFFER" || t === "REQUEST" ? (t as "OFFER" | "REQUEST") : undefined;
  const page = pageParam(sp.page);
  const q = param(sp.q);
  const hidden = param(sp.hidden) === "1";
  const where: Prisma.OfferWhereInput = {
    AND: [
      type ? { type } : {},
      hidden ? { hiddenAt: { not: null } } : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { author: { email: { contains: q, mode: "insensitive" } } },
              { company: { legalName: { contains: q, mode: "insensitive" } } },
              { company: { tradeName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };
  const [total, offers] = await Promise.all([
    db.offer.count({ where }),
    db.offer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        author: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { legalName: true, tradeName: true } },
        _count: { select: { responses: true } },
        badge: { select: { name: true, color: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader title={ka.admin.offers} text={ka.catalog.results(total)} />
      <FilterLinks
        base="/admin/offers"
        param="type"
        current={type}
        options={[
          { value: "", label: ka.common.all },
          { value: "OFFER", label: ka.enums.offerType.OFFER },
          { value: "REQUEST", label: ka.enums.offerType.REQUEST },
        ]}
      />
      <form className="mb-4 flex max-w-xl flex-wrap items-center gap-2">
        {type && <input type="hidden" name="type" value={type} />}
        <input name="q" type="search" defaultValue={q} placeholder={ka.admin.offerSearch} className={`${controlClass} h-10 flex-1`} />
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input type="checkbox" name="hidden" value="1" defaultChecked={hidden} /> {ka.admin.onlyHidden}
        </label>
        <button type="submit" className="h-10 rounded-[10px] border border-line px-4 text-sm">{ka.catalog.search}</button>
      </form>
      {offers.length === 0 ? (
        <EmptyState text={ka.common.noData} />
      ) : (
        <Table head={[ka.offerForm.title, ka.admin.offerAuthor, ka.common.status, ka.panel.responses, ka.common.date, ka.common.actions]}>
          {offers.map((o) => (
            <tr key={o.id}>
              <Td>
                <Link href={`/admin/offers/${o.id}`} className="font-medium text-accent-strong hover:underline">{o.title}</Link>
                <div className="text-xs text-muted">{ka.enums.offerType[o.type]}</div>
              </Td>
              <Td>
                {/* Admins see the real author of anonymous offers (platform knows identity). */}
                {o.author.firstName} {o.author.lastName}
                <div className="text-xs text-muted">{o.author.email}{o.company ? ` · ${companyName(o.company)}` : ""}</div>
                {o.isAnonymous && <Badge tone="navy">{ka.offer.anonymous}</Badge>}
              </Td>
              <Td>
                <OfferStatusBadge status={o.status} />
                {o.hiddenAt && <div className="mt-1"><Badge tone="danger">{ka.admin.hiddenByAdmin}</Badge><div className="max-w-48 text-xs text-muted">{o.hiddenReason}</div></div>}
              </Td>
              <Td className="tabular-nums">{o._count.responses}</Td>
              <Td className="whitespace-nowrap text-muted">{formatDate(o.createdAt)}</Td>
              <Td>
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                  {o.badge && <span className={`rounded-full px-2 py-0.5 ${BADGE_STYLE[o.badge.color] ?? BADGE_STYLE.blue}`}>{o.badge.name}</span>}
                  {o.commissionPct && <span className="rounded-full bg-chip px-2 py-0.5 font-semibold">{o.commissionPct.toString()}%</span>}
                </div>
                <Link href={`/admin/offers/${o.id}`} className="mb-2 inline-flex text-sm font-bold text-accent hover:underline">{ka.sgba.offerManage} →</Link>
                {o.hiddenAt ? (
                  <form action={adminRestoreOfferAction}>
                    <input type="hidden" name="offerId" value={o.id} />
                    <Button type="submit" size="sm" variant="secondary">{ka.admin.restoreOffer}</Button>
                  </form>
                ) : (
                  <details>
                    <summary className="cursor-pointer text-xs text-danger">{ka.admin.hideOffer}</summary>
                    <form action={adminArchiveOfferAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="offerId" value={o.id} />
                      <input name="reason" required minLength={3} placeholder={ka.admin.hideReason} className={`${controlClass} h-8 w-44 text-xs`} />
                      <Button type="submit" size="sm" variant="danger">{ka.admin.hideOffer}</Button>
                    </form>
                  </details>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/offers" params={{ type, q, hidden: hidden ? "1" : undefined }} />
    </>
  );
}
