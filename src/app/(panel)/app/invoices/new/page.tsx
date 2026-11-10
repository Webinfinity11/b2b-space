import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { otherPartyLabel, partySelect } from "@/lib/chat";
import { db } from "@/lib/db";
import { dealSideFor } from "@/lib/deals";
import { formatDateTime } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { visibleConversations } from "@/lib/scope";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: ka.invoice.newTitle };

/** Entry point for "create invoice": pick the deal (conversation) where you are the seller. */
export default async function NewInvoicePage() {
  const user = await requireUser("/app/invoices/new");
  const m = await getActiveMembership(user.id);
  const rows = await db.conversation.findMany({
    where: visibleConversations(user.id, m),
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      participants: { select: partySelect, orderBy: { createdAt: "asc" } },
      offer: { select: { type: true, title: true } },
      dealTerms: { select: { versions: { select: { invoice: { select: { id: true } } } } } },
    },
  });

  const sellable = rows.flatMap((c) => {
    const me = c.participants.find((p) => p.userId === user.id) ?? c.participants.find((p) => p.companyId && p.companyId === m?.companyId);
    if (!me || dealSideFor(me.side, c.offer?.type ?? null) !== "SELLER") return [];
    if (me.companyId && !(m && m.companyId === me.companyId && hasPermission(m, "invoices.manage"))) return [];
    const invoices = c.dealTerms?.versions.filter((v) => v.invoice).length ?? 0;
    return [{ c, side: me.side, invoices }];
  });

  return (
    <>
      <PageHeader title={ka.invoice.newTitle} text={ka.invoice.newText} action={<ButtonLink href="/app/invoices" variant="secondary">{ka.common.back}</ButtonLink>} />
      {sellable.length === 0 ? (
        <EmptyState text={ka.invoice.newEmpty} action={<ButtonLink href="/offers" variant="secondary">{ka.nav.offers}</ButtonLink>} />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {sellable.map(({ c, side, invoices }) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <Link href={`/app/conversations/${c.id}`} className="font-medium hover:underline">{c.subject}</Link>
                  <p className="text-sm text-muted">
                    {otherPartyLabel(c.participants, side)} · {formatDateTime(c.lastMessageAt)}
                    {invoices > 0 && ` · ${ka.invoice.invoicesCount(invoices)}`}
                  </p>
                </div>
                <ButtonLink href={`/app/conversations/${c.id}#invoice`} size="sm">
                  <Icon name="invoice" size={16} /> {ka.invoice.composerButton}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
