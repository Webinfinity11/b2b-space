import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { companyName } from "@/lib/public";
import { manageableOffers } from "@/lib/scope";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { ResponseStatusBadge } from "@/components/panel/StatusBadges";

export const metadata: Metadata = { title: ka.responses.title };

export default async function ResponsesPage() {
  const user = await requireUser("/company/responses");
  const m = await getActiveMembership(user.id);
  const [received, sent] = await Promise.all([
    db.offerResponse.findMany({
      where: { offer: manageableOffers(user.id, m) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        offer: { select: { id: true, title: true } },
        responder: { select: { firstName: true, lastName: true } },
        responderCompany: { select: { legalName: true, tradeName: true } },
        conversation: { select: { id: true } },
      },
    }),
    db.offerResponse.findMany({
      where: { responderUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { offer: { select: { id: true, title: true } }, conversation: { select: { id: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title={ka.responses.title} text={ka.responses.text} />
      {received.length === 0 ? (
        <EmptyState text={ka.responses.empty} />
      ) : (
        <Table head={[ka.responses.from, ka.responses.on, ka.offer.message, ka.common.status, ka.common.date]}>
          {received.map((r) => (
            <tr key={r.id}>
              <Td className="font-medium">{r.responderCompany ? companyName(r.responderCompany) : `${r.responder.firstName} ${r.responder.lastName}`}</Td>
              <Td><Link href={`/company/offers/${r.offer.id}`} className="text-accent-strong hover:underline">{r.offer.title}</Link></Td>
              <Td>
                <p className="line-clamp-2 max-w-sm text-muted">{r.message}</p>
                {r.conversation && <Link href={`/app/conversations/${r.conversation.id}`} className="text-xs text-accent-strong hover:underline">{ka.offer.openConversation} →</Link>}
              </Td>
              <Td><ResponseStatusBadge status={r.status} /></Td>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}

      {sent.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-lg font-semibold">{ka.responses.sentTitle}</h2>
          <Table head={[ka.responses.on, ka.offer.message, ka.common.status, ka.common.date]}>
            {sent.map((r) => (
              <tr key={r.id}>
                <Td><Link href={`/offers/${r.offer.id}`} className="text-accent-strong hover:underline">{r.offer.title}</Link></Td>
                <Td>
                  <p className="line-clamp-2 max-w-sm text-muted">{r.message}</p>
                  {r.conversation && <Link href={`/app/conversations/${r.conversation.id}`} className="text-xs text-accent-strong hover:underline">{ka.offer.openConversation} →</Link>}
                </Td>
                <Td><ResponseStatusBadge status={r.status} /></Td>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
