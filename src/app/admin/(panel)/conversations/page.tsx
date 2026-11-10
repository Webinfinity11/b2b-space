import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { pageParam, param } from "@/lib/params";
import { companyName } from "@/lib/public";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Table, Td } from "@/components/ui/Table";
import { controlClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: ka.admin.conversations };

const PER_PAGE = 25;

/** Metadata only — message content is never shown here (see the access flow on the detail page). */
export default async function AdminConversationsPage({ searchParams }: PageProps<"/admin/conversations">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = param(sp.q, 80);
  const page = pageParam(sp.page);
  const where: Prisma.ConversationWhereInput = q
    ? {
        OR: [
          { subject: { contains: q, mode: "insensitive" } },
          { participants: { some: { company: { OR: [{ legalName: { contains: q, mode: "insensitive" } }, { tradeName: { contains: q, mode: "insensitive" } }] } } } },
          { participants: { some: { user: { email: { contains: q, mode: "insensitive" } } } } },
        ],
      }
    : {};
  const [total, rows] = await Promise.all([
    db.conversation.count({ where }),
    db.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        participants: { orderBy: { createdAt: "asc" }, select: { id: true, user: { select: { firstName: true, lastName: true } }, company: { select: { legalName: true, tradeName: true } } } },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader title={ka.admin.conversations} text={ka.admin.chatListText} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={ka.admin.chatSearch} aria-label={ka.admin.chatSearch} className={`${controlClass} h-10 w-full sm:w-72`} />
        <button type="submit" className={buttonClass("secondary", "md")}>{ka.common.filter}</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState text={ka.common.noData} />
      ) : (
        <Table head={[ka.admin.chatSubject, ka.admin.chatParties, ka.admin.chatMessages, ka.admin.chatLast]}>
          {rows.map((c) => (
            <tr key={c.id}>
              <Td>
                <Link href={`/admin/conversations/${c.id}`} className="font-medium text-accent-strong hover:underline">{c.subject}</Link>
              </Td>
              <Td className="text-sm">
                {c.participants.map((p) => (
                  <div key={p.id}>{p.company ? companyName(p.company) : `${p.user.firstName} ${p.user.lastName}`}</div>
                ))}
              </Td>
              <Td className="tabular-nums">{c._count.messages}</Td>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(c.lastMessageAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/conversations" params={{ q }} />
    </>
  );
}
