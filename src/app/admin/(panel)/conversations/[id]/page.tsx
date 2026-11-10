import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { grantConversationAccessAction } from "@/actions/admin";
import { CHAT_ACCESS_ACTION, CHAT_ACCESS_MINUTES, activeChatGrant } from "@/lib/admin-access";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatTime } from "@/lib/format";
import { companyName } from "@/lib/public";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.admin.conversations };

export default async function AdminConversationPage({ params }: PageProps<"/admin/conversations/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const c = await db.conversation.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { createdAt: "asc" },
        select: { userId: true, side: true, identityRevealed: true, user: { select: { firstName: true, lastName: true, email: true } }, company: { select: { id: true, legalName: true, tradeName: true } } },
      },
      offer: { select: { id: true, title: true, type: true, isAnonymous: true } },
      dealTerms: { select: { versions: { select: { invoice: { select: { id: true, number: true } } } } } },
      _count: { select: { messages: true } },
    },
  });
  if (!c) notFound();

  const [grant, history] = await Promise.all([
    activeChatGrant(admin.id, c.id),
    db.auditLog.findMany({
      where: { action: CHAT_ACCESS_ACTION, entityType: "Conversation", entityId: c.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { firstName: true, lastName: true } } },
    }),
  ]);
  const messages = grant ? await db.message.findMany({ where: { conversationId: c.id }, orderBy: { createdAt: "asc" }, take: 1000 }) : [];
  const byUser = new Map(c.participants.map((p) => [p.userId, p]));
  const invoices = c.dealTerms?.versions.flatMap((v) => (v.invoice ? [v.invoice] : [])) ?? [];
  const expires = grant ? new Date(grant.createdAt.getTime() + CHAT_ACCESS_MINUTES * 60_000) : null;
  const name = (p: (typeof c.participants)[number]) => `${p.user.firstName} ${p.user.lastName}${p.company ? ` · ${companyName(p.company)}` : ""}`;

  return (
    <>
      <PageHeader title={c.subject} text={ka.admin.chatMessagesCount(c._count.messages)} action={<ButtonLink href="/admin/conversations" variant="secondary">{ka.common.back}</ButtonLink>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {grant ? (
            <Card>
              <CardHeader title={ka.admin.chatContent} text={ka.admin.chatAccessUntil(formatTime(expires!))} action={<Badge tone="warning">{ka.admin.chatReadOnly}</Badge>} />
              <CardBody className="space-y-3 bg-canvas/40">
                {messages.length === 0 && <p className="text-center text-sm text-muted">{ka.chat.noMessages}</p>}
                {messages.map((msg) => {
                  if (msg.kind === "SYSTEM" || msg.kind === "TERMS") {
                    return (
                      <p key={msg.id} className="mx-auto max-w-md whitespace-pre-line rounded-lg bg-surface px-3 py-1 text-center text-xs text-muted">
                        {ka.chat.system[msg.body] ?? msg.body} · {formatDateTime(msg.createdAt)}
                      </p>
                    );
                  }
                  const p = msg.senderId ? byUser.get(msg.senderId) : null;
                  return (
                    <div key={msg.id} className="max-w-[85%] rounded-xl border border-line bg-surface px-4 py-2.5">
                      <div className="mb-0.5 text-xs font-medium text-accent-strong">{p ? name(p) : ka.admin.system}</div>
                      {msg.body && <p className="whitespace-pre-line break-words text-sm">{msg.body}</p>}
                      {msg.kind === "FILE" && (
                        <a href={`/api/chat-files/${msg.id}`} target="_blank" className="mt-1 flex items-center gap-1.5 text-sm text-accent underline">
                          📎 <span className="truncate">{msg.fileName}</span>
                        </a>
                      )}
                      <div className="mt-1 text-[11px] text-muted">{formatDateTime(msg.createdAt)}</div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title={ka.admin.chatAccessTitle} text={ka.admin.chatAccessText(CHAT_ACCESS_MINUTES)} />
              <CardBody>
                <ActionForm action={grantConversationAccessAction} className="space-y-3">
                  <input type="hidden" name="conversationId" value={c.id} />
                  <Field label={ka.admin.reason} name="reason" hint={ka.admin.chatReasonHint}>
                    <Textarea name="reason" rows={3} maxLength={1000} />
                  </Field>
                  <SubmitButton variant="danger">{ka.admin.chatAccessButton}</SubmitButton>
                </ActionForm>
              </CardBody>
            </Card>
          )}
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader title={ka.admin.chatParties} />
            <CardBody>
              <ul className="space-y-2 text-sm">
                {c.participants.map((p) => (
                  <li key={p.userId}>
                    <div className="font-medium">{name(p)}</div>
                    <div className="text-xs text-muted">
                      {p.user.email}
                      {!p.identityRevealed && ` · ${ka.offer.anonymous}`}
                    </div>
                  </li>
                ))}
              </ul>
              {c.offer && (
                <p className="mt-3 border-t border-line pt-3 text-sm">
                  <Link href={`/offers/${c.offer.id}`} target="_blank" className="text-accent-strong hover:underline">{c.offer.title}</Link>
                  <span className="text-xs text-muted"> · {ka.enums.offerType[c.offer.type]}</span>
                </p>
              )}
              {invoices.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                  {invoices.map((inv) => (
                    <li key={inv.id}>
                      <Link href={`/admin/invoices/${inv.id}`} className="text-accent-strong hover:underline">{ka.invoice.invoiceWord} {inv.number}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ka.admin.chatAccessLog} />
            <CardBody>
              {history.length === 0 ? (
                <p className="text-sm text-muted">{ka.admin.chatAccessNone}</p>
              ) : (
                <ol className="space-y-3 text-sm">
                  {history.map((h) => (
                    <li key={h.id} className="border-l-2 border-accent pl-3">
                      <div className="text-xs text-muted">{formatDateTime(h.createdAt)} · {h.actor ? `${h.actor.firstName} ${h.actor.lastName}` : ka.admin.system}</div>
                      <p className="mt-0.5 whitespace-pre-line">{String((h.metadata as { reason?: string } | null)?.reason ?? "")}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
