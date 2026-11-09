import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { companyName } from "@/lib/public";
import { manageableOffers, visibleConversations, visibleInvoices } from "@/lib/scope";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/panel/StatusBadges";
import { HowItWorks, QuickActions, StartChecklist } from "@/components/panel/QuickStart";

export default async function DashboardPage() {
  const user = await requireUser("/app");
  const m = await getActiveMembership(user.id);
  const offerScope = manageableOffers(user.id, m);
  const convScope = visibleConversations(user.id, m);
  const canSeeFinance = !m || hasPermission(m, "finance.view") || hasPermission(m, "invoices.view");
  const invScope = visibleInvoices(user.id, m);

  const [activeOffers, incomingResponses, conversations, pendingTerms, notifications, invoices] = await Promise.all([
    db.offer.count({ where: { AND: [offerScope, { status: { in: ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"] } }] } }),
    db.offerResponse.count({ where: { offer: offerScope, status: { in: ["SENT", "VIEWED"] } } }),
    db.conversation.count({ where: convScope }),
    db.dealTermsVersion.count({
      where: { status: { in: ["SENT_FOR_APPROVAL", "APPROVED_BY_ONE"] }, dealTerms: { conversation: convScope } },
    }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    canSeeFinance
      ? db.invoice.findMany({
          where: { AND: [invScope, { status: { notIn: ["DRAFT", "CANCELLED"] } }] },
          select: { currency: true, total: true, paidAmount: true, status: true, dueDate: true, sellerUserId: true, sellerCompanyId: true },
        })
      : Promise.resolve([]),
  ]);

  // Onboarding progress (real data)
  const [company, anyOffer, memberCount] = await Promise.all([
    m ? db.company.findUnique({ where: { id: m.companyId }, select: { logoUrl: true, description: true } }) : null,
    db.offer.count({ where: offerScope }),
    m ? db.companyMember.count({ where: { companyId: m.companyId, status: "ACTIVE" } }) : 0,
  ]);
  const st = ka.guide.steps;
  const steps = [
    { label: st.company, done: Boolean(m), href: "/company/new" },
    ...(m ? [{ label: st.logo, done: Boolean(company?.logoUrl && company?.description), href: "/company/profile" }] : []),
    { label: st.offer, done: anyOffer > 0, href: "/company/offers/new?type=OFFER" },
    ...(m?.role === "OWNER" ? [{ label: st.team, done: memberCount > 1, href: "/company/team" }] : []),
    { label: st.chat, done: conversations > 0, href: "/offers" },
  ];

  // Totals per currency — never summed across currencies.
  const byCurrency = new Map<string, { total: number; paid: number; due: number; overdue: number }>();
  let issued = 0;
  let received = 0;
  const now = new Date();
  for (const inv of invoices) {
    const isSeller = inv.sellerCompanyId ? inv.sellerCompanyId === m?.companyId : inv.sellerUserId === user.id;
    if (isSeller) issued++;
    else received++;
    const row = byCurrency.get(inv.currency) ?? { total: 0, paid: 0, due: 0, overdue: 0 };
    const total = Number(inv.total);
    const paid = Number(inv.paidAmount);
    row.total += total;
    row.paid += paid;
    const open = Math.max(0, total - paid);
    if (inv.status === "OVERDUE" || (inv.dueDate && inv.dueDate < now && open > 0)) row.overdue += open;
    else row.due += open;
    byCurrency.set(inv.currency, row);
  }

  return (
    <>
      <PageHeader title={ka.panel.overviewTitle} text={ka.panel.dashboardText} />
      <QuickActions isOwner={m?.role === "OWNER"} hasCompany={Boolean(m)} />
      <StartChecklist steps={steps} />

      {!m && (
        <Card className="mb-6 border-accent/50">
          <CardBody className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="font-semibold">{ka.panel.getStartedTitle}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{ka.panel.getStartedText}</p>
            </div>
            <ButtonLink href="/company/new">{ka.panel.createCompany}</ButtonLink>
          </CardBody>
        </Card>
      )}

      {m && (m.company.verificationStatus === "REJECTED" || m.company.verificationStatus === "SUSPENDED") && (
        <Card className="mb-6">
          <CardBody className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{companyName(m.company)}</h2>
                <VerificationBadge status={m.company.verificationStatus} />
              </div>
              <p className="mt-1 text-sm text-muted">{ka.verification.statusHint[m.company.verificationStatus]}</p>
            </div>
            {m.role === "OWNER" && <ButtonLink href="/company/verification" variant="secondary">{ka.panel.verification}</ButtonLink>}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={ka.panel.stats.activeOffers} value={activeOffers} />
        <StatCard label={ka.panel.stats.incomingResponses} value={incomingResponses} />
        <StatCard label={ka.panel.stats.conversations} value={conversations} />
        <StatCard label={ka.panel.stats.pendingTerms} value={pendingTerms} />
        {canSeeFinance && (
          <>
            <StatCard label={ka.panel.stats.invoicesIssued} value={issued} />
            <StatCard label={ka.panel.stats.invoicesReceived} value={received} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canSeeFinance && (
          <Card>
            <CardHeader title={ka.panel.financeByCurrency} />
            <CardBody>
              {byCurrency.size === 0 ? (
                <p className="text-sm text-muted">{ka.panel.financeEmpty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="pb-2 font-medium" />
                        <th className="pb-2 text-right font-medium">{ka.panel.finance_total}</th>
                        <th className="pb-2 text-right font-medium">{ka.panel.finance_paid}</th>
                        <th className="pb-2 text-right font-medium">{ka.panel.finance_due}</th>
                        <th className="pb-2 text-right font-medium">{ka.panel.finance_overdue}</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {[...byCurrency].map(([cur, r]) => (
                        <tr key={cur} className="border-t border-line">
                          <td className="py-2 font-medium">{cur}</td>
                          <td className="py-2 text-right">{formatMoney(r.total, cur)}</td>
                          <td className="py-2 text-right text-success">{formatMoney(r.paid, cur)}</td>
                          <td className="py-2 text-right">{formatMoney(r.due, cur)}</td>
                          <td className="py-2 text-right text-danger">{formatMoney(r.overdue, cur)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader
            title={ka.panel.recentNotifications}
            action={<Link href="/app/notifications" className="text-sm text-accent-strong hover:underline">{ka.home.viewAll}</Link>}
          />
          <CardBody>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted">{ka.panel.noNotifications}</p>
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-accent-strong"}`} />
                    <div className="min-w-0">
                      {n.link ? <Link href={n.link} className="text-sm hover:underline">{n.title}</Link> : <p className="text-sm">{n.title}</p>}
                      <p className="text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
      <HowItWorks />
    </>
  );
}
