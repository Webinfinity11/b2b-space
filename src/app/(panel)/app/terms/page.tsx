import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { visibleConversations } from "@/lib/scope";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { DealStatusBadge } from "@/components/panel/TermsCard";

export const metadata: Metadata = { title: ka.terms.title };

export default async function TermsListPage() {
  const user = await requireUser("/app/terms");
  const m = await getActiveMembership(user.id);
  const deals = await db.dealTerms.findMany({
    where: { conversation: visibleConversations(user.id, m) },
    orderBy: { updatedAt: "desc" },
    include: {
      conversation: { select: { id: true, subject: true } },
      currentVersion: { include: { invoice: { select: { id: true, number: true } } } },
    },
  });

  return (
    <>
      <PageHeader title={ka.terms.title} text={ka.terms.listText} />
      {deals.length === 0 ? (
        <EmptyState text={ka.terms.empty} />
      ) : (
        <Table head={[ka.chat.relatedOffer, ka.terms.versionCol, ka.terms.total, ka.common.status, ka.common.date]}>
          {deals.map((d) => {
            const v = d.currentVersion;
            return (
              <tr key={d.id}>
                <Td>
                  <Link href={`/app/conversations/${d.conversation.id}`} className="font-medium text-accent-strong hover:underline">{d.conversation.subject}</Link>
                  {v?.invoice && (
                    <div>
                      <Link href={`/app/invoices/${v.invoice.id}`} className="text-xs text-accent-strong hover:underline">{v.invoice.number}</Link>
                    </div>
                  )}
                </Td>
                <Td className="tabular-nums">{v?.versionNumber ?? ka.common.none}</Td>
                <Td className="whitespace-nowrap tabular-nums">{v ? formatMoney(v.total, v.currency) : ka.common.none}</Td>
                <Td>{v && <DealStatusBadge status={v.status} />}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(d.updatedAt)}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
