import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { partySelect } from "@/lib/chat";
import { activeRules, dealCommissionPct, expectedCommission, resolveCommission } from "@/lib/commission";
import { db } from "@/lib/db";
import { dealSideFor } from "@/lib/deals";
import { formatAmount } from "@/lib/money";
import { param } from "@/lib/params";
import { companyName } from "@/lib/public";
import { visibleConversations } from "@/lib/scope";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { KpiCard, PageHeader } from "@/components/ui/Card";
import { StagePill } from "@/components/panel/StagePill";

export const metadata: Metadata = { title: ka.sgba.nav.deals };

type Party = { side: "AUTHOR" | "RESPONDER"; identityRevealed: boolean; user: { firstName: string; lastName: string }; company: { legalName: string; tradeName: string | null } | null };
const partyName = (p?: Party) => (!p ? "—" : !p.identityRevealed ? ka.chat.anonymousParty : p.company ? companyName(p.company) : `${p.user.firstName} ${p.user.lastName}`);

/** Negotiations table: seller/offer, buyer, stage, amount, platform commission. */
export default async function DealsPage({ searchParams }: PageProps<"/app/conversations">) {
  const user = await requireUser("/app/conversations");
  const m = await getActiveMembership(user.id);
  const q = param((await searchParams).q);
  const scope = visibleConversations(user.id, m);
  const rows = await db.conversation.findMany({
    where: { AND: [scope, q ? { subject: { contains: q, mode: "insensitive" } } : {}] },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: {
      participants: { select: partySelect },
      offer: { select: { title: true, type: true, commissionPct: true, categoryId: true } },
      _count: { select: { messages: true } },
    },
  });
  const rules = await activeRules();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const active = rows.filter((r) => r.stage !== "CONTRACT");
  const total = active.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const commission = active.reduce((s, r) => s + expectedCommission(r, rules), 0);
  const closing = rows.filter((r) => (r.stage === "CONTRACT" || r.stage === "MEETING") && r.updatedAt >= monthStart).length;

  return (
    <>
      <PageHeader
        eyebrow={ka.sgba.dealsEyebrow}
        title={ka.sgba.nav.deals}
        text={ka.sgba.dealsText}
        action={
          <ButtonLink href="/companies">
            <Icon name="plus" size={16} /> {ka.sgba.newDeal}
          </ButtonLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={ka.sgba.kpiActiveCases} value={active.length} icon={<Icon name="chat" size={18} />} tone="blue" />
        <KpiCard label={ka.sgba.kpiTotalValue} value={formatAmount(total, "GEL")} icon={<Icon name="trend" size={18} />} tone="green" />
        <KpiCard label={ka.sgba.kpiExpectedCommission} value={formatAmount(commission, "GEL")} icon={<Icon name="invoice" size={18} />} tone="violet" />
        <KpiCard label={ka.sgba.kpiClosing} value={closing} icon={<Icon name="clock" size={18} />} tone="yellow" />
      </div>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted">{ka.sgba.noDealsTable}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">{ka.sgba.colSellerOffer}</th>
                  <th className="px-5 py-3 font-medium">{ka.sgba.colBuyer}</th>
                  <th className="px-5 py-3 font-medium">{ka.sgba.colStage}</th>
                  <th className="px-5 py-3 text-right font-medium">{ka.sgba.colDeal}</th>
                  <th className="px-5 py-3 text-right font-medium">{ka.sgba.colCommission}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const seller = c.participants.find((p) => dealSideFor(p.side, c.offer?.type ?? null, c.sellerSide) === "SELLER");
                  const buyer = c.participants.find((p) => p !== seller);
                  const { pct } = resolveCommission(dealCommissionPct(c), rules, c.offer?.categoryId ?? null, c.amount);
                  const amount = c.amount ? Number(c.amount) : null;
                  return (
                    <tr key={c.id} className="hover:bg-canvas/50">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-ink">{partyName(seller)}</div>
                        <div className="max-w-[280px] truncate text-xs text-muted">{c.offer?.title ?? c.subject}</div>
                      </td>
                      <td className="px-5 py-3.5">{partyName(buyer)}</td>
                      <td className="px-5 py-3.5"><StagePill stage={c.stage} /></td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{amount !== null ? formatAmount(amount, "GEL") : "—"}</td>
                      <td className="px-5 py-3.5 text-right text-xs font-semibold text-success tabular-nums">
                        {amount !== null && pct ? ka.sgba.commissionLine(formatAmount(expectedCommission(c, rules), "GEL"), pct.toString()) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/app/conversations/${c.id}`} className="whitespace-nowrap text-sm font-medium text-accent-strong hover:underline">{ka.sgba.open} →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
