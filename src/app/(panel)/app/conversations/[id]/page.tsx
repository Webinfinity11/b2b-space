import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { sendMessageAction, updateDealInfoAction } from "@/actions/chat";
import { setResponseStatusAction } from "@/actions/offers";
import { Button } from "@/components/ui/Button";
import { ResponseStatusBadge } from "@/components/panel/StatusBadges";
import { activeRules, dealCommissionPct, resolveCommission } from "@/lib/commission";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { partyLabel, partySelect } from "@/lib/chat";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { visibleConversations } from "@/lib/scope";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/Form";
import { ChatLive } from "@/components/panel/ChatLive";
import { ChatInvoiceCard } from "@/components/panel/ChatInvoiceCard";
import { loadDealContext } from "@/lib/deals";
import { CURRENCIES } from "@/lib/currencies";
import { InvoiceComposer } from "@/components/panel/InvoiceComposer";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: ka.chat.title };

export default async function ConversationPage({ params }: PageProps<"/app/conversations/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/app/conversations/${id}`);
  const m = await getActiveMembership(user.id);
  const c = await db.conversation.findFirst({
    where: { AND: [{ id }, visibleConversations(user.id, m)] },
    include: {
      participants: { select: partySelect, orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" }, take: 500 },
      offer: { select: { id: true, title: true, type: true, commissionPct: true, categoryId: true } },
      response: { select: { id: true, status: true } },
    },
  });
  if (!c) notFound();
  const { pct } = resolveCommission(dealCommissionPct(c), await activeRules(), c.offer?.categoryId ?? null, c.amount);
  const deal = await loadDealContext(c.id);
  const canInvoice = Boolean(deal && deal.dealSide === "SELLER" && deal.can("invoices.manage"));
  const offerFull = canInvoice && c.offer ? await db.offer.findUnique({ where: { id: c.offer.id }, select: { title: true, currency: true, priceMin: true, priceType: true } }) : null;

  const me = c.participants.find((p) => p.userId === user.id);
  const mySide = me?.side ?? c.participants.find((p) => p.companyId && p.companyId === m?.companyId)?.side ?? null;
  const byUser = new Map(c.participants.map((p) => [p.userId, p]));
  // The offer's side opening the chat marks the response as seen.
  if (c.response?.status === "SENT" && mySide === "AUTHOR") {
    await db.offerResponse.updateMany({ where: { id: c.response.id, status: "SENT" }, data: { status: "VIEWED" } });
  }
  const others = c.participants.filter((p) => p.userId !== user.id);
  // "Read" means the other party read it — colleagues on our side don't count.
  const otherSide = others.filter((p) => !mySide || p.side !== mySide);
  const othersLastRead = otherSide.reduce<Date | null>((acc, p) => (p.lastReadAt && (!acc || p.lastReadAt > acc) ? p.lastReadAt : acc), null);
  const lastMine = [...c.messages].reverse().find((msg) => msg.senderId === user.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="flex min-h-[70dvh] flex-col">
        <CardHeader
          title={c.subject}
          text={others.map((p) => partyLabel(p, mySide, user.id)).join(", ")}
          action={
            canInvoice ? (
              <a href="#invoice" className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-hover">
                <Icon name="invoice" size={16} /> {ka.invoice.composerButton}
              </a>
            ) : deal?.dealSide === "BUYER" ? (
              <span className="max-w-56 text-right text-xs text-muted">{ka.invoice.chatBuyerHint}</span>
            ) : null
          }
        />
        <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/40 px-4 py-5 sm:px-5">
          {c.messages.length === 0 && <p className="text-center text-sm text-muted">{ka.chat.noMessages}</p>}
          {c.messages.map((msg) => {
            if (msg.kind === "TERMS" && msg.fileUrl?.startsWith("/app/invoices/")) {
              const mine = msg.senderId === user.id;
              const invId = msg.fileUrl.split("/").pop();
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="w-full max-w-sm rounded-xl border-2 border-accent bg-surface p-4 shadow-card">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-lg bg-accent/15 text-accent"><Icon name="invoice" /></span>
                      <div>
                        <div className="text-xs text-muted">{ka.invoice.invoiceWord}</div>
                        <div className="font-semibold tabular-nums">{msg.body}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={msg.fileUrl} className="flex-1 rounded-lg bg-accent px-3 py-2 text-center text-sm font-medium text-on-accent hover:bg-accent-hover">{ka.invoice.chatCardOpen}</Link>
                      <a href={`/api/invoices/${invId}/pdf`} target="_blank" className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-accent">{ka.invoice.chatCardPdf}</a>
                    </div>
                    <div className="mt-2 text-[11px] text-muted">{formatDateTime(msg.createdAt)}</div>
                  </div>
                </div>
              );
            }
            if (msg.kind === "SYSTEM" || msg.kind === "TERMS") {
              return (
                <p key={msg.id} className={`mx-auto max-w-md whitespace-pre-line px-3 py-1 text-center text-xs ${msg.kind === "TERMS" ? "rounded-lg border border-accent/40 bg-accent/10 text-ink" : "rounded-full bg-surface text-muted"}`}>
                  {ka.chat.system[msg.body] ?? msg.body} · {formatDateTime(msg.createdAt)}
                </p>
              );
            }
            const mine = msg.senderId === user.id;
            const sender = msg.senderId ? byUser.get(msg.senderId) : null;
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 sm:max-w-[70%] ${mine ? "bg-accent text-on-accent" : "border border-line bg-surface"}`}>
                  {!mine && sender && <div className="mb-0.5 text-xs font-medium text-accent-strong">{partyLabel(sender, mySide, user.id)}</div>}
                  {msg.body && <p className="whitespace-pre-line break-words text-sm">{msg.body}</p>}
                  {msg.kind === "FILE" && (
                    <a href={`/api/chat-files/${msg.id}`} target="_blank" className={`mt-1 flex items-center gap-1.5 text-sm underline ${mine ? "text-white" : "text-accent"}`}>
                      📎 <span className="truncate">{msg.fileName}</span>
                    </a>
                  )}
                  <div className={`mt-1 text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>
                    {formatDateTime(msg.createdAt)}
                    {mine && msg.id === lastMine?.id && othersLastRead && othersLastRead >= msg.createdAt ? ` · ${ka.chat.read}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
          <ChatLive conversationId={c.id} lastMessageId={c.messages.at(-1)?.id ?? null} />
        </div>
        <div className="border-t border-line p-3 sm:p-4">
          <ActionForm action={sendMessageAction} resetOnSuccess showSuccess={false} className="space-y-2">
            <input type="hidden" name="conversationId" value={c.id} />
            <label htmlFor="body" className="sr-only">{ka.chat.placeholder}</label>
            <Textarea name="body" rows={2} maxLength={5000} placeholder={ka.chat.placeholder} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex min-w-0 items-center gap-2 text-xs text-muted">
                <span className="sr-only">{ka.chat.attach}</span>
                <Input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="h-9 max-w-64 pt-1.5 text-xs" title={ka.chat.attachHint} />
              </label>
              <SubmitButton>{ka.chat.send}</SubmitButton>
            </div>
          </ActionForm>
          {canInvoice && (
            <div className="mt-3 border-t border-line pt-3">
              <InvoiceComposer
                conversationId={c.id}
                currencies={CURRENCIES}
                defaults={{
                  name: offerFull?.title.replace(/\s*\(დემო\)$/, "") ?? "",
                  currency: offerFull?.currency ?? "GEL",
                  price: offerFull && (offerFull.priceType === "FIXED" || offerFull.priceType === "FROM") ? (offerFull.priceMin?.toString() ?? "") : "",
                }}
              />
            </div>
          )}
        </div>
      </Card>

      <aside className="space-y-6">
        <Card>
          <CardHeader title={ka.sgba.dealPanel} text={ka.sgba.dealPanelText} />
          <CardBody>
            <ActionForm action={updateDealInfoAction} className="space-y-3" toast>
              <input type="hidden" name="conversationId" value={c.id} />
              <Field label={ka.sgba.colStage} name="stage">
                <Select name="stage" defaultValue={c.stage} options={Object.entries(ka.sgba.stages).map(([value, label]) => ({ value, label }))} />
              </Field>
              {!c.offer && mySide && (
                <Field label={ka.sgba.sellerLabel} name="seller">
                  <Select
                    name="seller"
                    defaultValue={deal?.dealSide === "SELLER" ? "us" : "them"}
                    options={[{ value: "us", label: ka.sgba.sellerUs }, { value: "them", label: ka.sgba.sellerThem }]}
                  />
                </Field>
              )}
              <Field label={ka.sgba.dealAmount} name="amount" optional>
                <Input name="amount" inputMode="decimal" defaultValue={c.amount?.toString() ?? ""} />
              </Field>
              <div className="flex items-center justify-between rounded-[10px] bg-[#e3f4ec] px-3 py-2 text-sm">
                <span className="text-[#1b6a4c]">{ka.sgba.dealCommission}</span>
                <span className="font-semibold text-success">{pct ? `${pct.toString()}%` : ka.sgba.dealCommissionNone}</span>
              </div>
              <SubmitButton className="w-full" variant="secondary">{ka.common.save}</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        {deal && deal.dealSide && <ChatInvoiceCard ctx={deal} />}
        {c.offer && (
          <Card>
            <CardHeader title={ka.chat.relatedOffer} />
            <CardBody>
              <Badge tone={c.offer.type === "REQUEST" ? "warning" : "info"}>{ka.enums.offerType[c.offer.type]}</Badge>
              <Link href={`/offers/${c.offer.id}`} className="mt-2 block text-sm font-medium text-accent-strong hover:underline">{c.offer.title}</Link>
              {c.response && (
                <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted">{ka.offer.responseLabel}</span>
                    <ResponseStatusBadge status={c.response.status === "SENT" && mySide === "AUTHOR" ? "VIEWED" : c.response.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mySide === "AUTHOR" && ["SENT", "VIEWED"].includes(c.response.status) && (
                      <>
                        <form action={setResponseStatusAction}>
                          <input type="hidden" name="responseId" value={c.response.id} />
                          <input type="hidden" name="op" value="accept" />
                          <Button type="submit" size="sm">{ka.offer.accept}</Button>
                        </form>
                        <form action={setResponseStatusAction}>
                          <input type="hidden" name="responseId" value={c.response.id} />
                          <input type="hidden" name="op" value="decline" />
                          <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.offer.decline}</Button>
                        </form>
                      </>
                    )}
                    {mySide === "RESPONDER" && c.response.status !== "WITHDRAWN" && (
                      <form action={setResponseStatusAction}>
                        <input type="hidden" name="responseId" value={c.response.id} />
                        <input type="hidden" name="op" value="withdraw" />
                        <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.offer.withdraw}</Button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title={ka.chat.participants} />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {c.participants.map((p) => (
                <li key={p.userId}>{partyLabel(p, mySide, user.id)}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
