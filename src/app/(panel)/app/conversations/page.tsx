import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { otherPartyLabel, partySelect } from "@/lib/chat";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { param } from "@/lib/params";
import { visibleConversations } from "@/lib/scope";
import { Badge } from "@/components/ui/Badge";
import { Card, EmptyState, PageHeader } from "@/components/ui/Card";
import { controlClass } from "@/components/ui/styles";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: ka.chat.title };

export default async function ConversationsPage({ searchParams }: PageProps<"/app/conversations">) {
  const user = await requireUser("/app/conversations");
  const m = await getActiveMembership(user.id);
  const q = param((await searchParams).q);
  const conversations = await db.conversation.findMany({
    where: { AND: [visibleConversations(user.id, m), q ? { subject: { contains: q, mode: "insensitive" } } : {}] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      participants: { select: partySelect },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, kind: true, createdAt: true, senderId: true } },
    },
  });

  // Unread counts per conversation (messages after my lastReadAt, not sent by me).
  const unread = new Map<string, number>();
  await Promise.all(
    conversations.map(async (c) => {
      const me = c.participants.find((p) => p.userId === user.id);
      const n = await db.message.count({
        where: { conversationId: c.id, senderId: { not: user.id }, kind: { not: "SYSTEM" }, ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}) },
      });
      unread.set(c.id, n);
    }),
  );

  return (
    <>
      <PageHeader title={ka.chat.title} text={ka.chat.text} />
      <form className="mb-4 max-w-md">
        <input name="q" type="search" defaultValue={q} placeholder={ka.chat.searchPlaceholder} className={`${controlClass} h-10`} />
      </form>
      {conversations.length === 0 ? (
        <EmptyState text={ka.chat.empty} action={<ButtonLink href="/offers">{ka.home.viewOffers}</ButtonLink>} />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {conversations.map((c) => {
              const me = c.participants.find((p) => p.userId === user.id);
              const mySide = me?.side ?? c.participants.find((p) => p.companyId && p.companyId === m?.companyId)?.side ?? null;
              const last = c.messages[0];
              const n = unread.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <Link href={`/app/conversations/${c.id}`} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-canvas/60">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`truncate ${n ? "font-semibold" : "font-medium"}`}>{c.subject}</span>
                        {n > 0 && <Badge tone="info">{ka.chat.unread(n)}</Badge>}
                      </div>
                      <p className="text-sm text-muted">{otherPartyLabel(c.participants, mySide)}</p>
                      {last && last.kind !== "SYSTEM" && <p className="mt-1 truncate text-sm text-muted">{last.body || "📎"}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted">{formatDateTime(c.lastMessageAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
