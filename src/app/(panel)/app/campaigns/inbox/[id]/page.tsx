import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { replyToCampaignAction } from "@/actions/campaigns";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { companyName } from "@/lib/public";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.sgba.campInboxTitle };

/** What a recipient company sees: the offer delivered by a campaign, with a reply → negotiation. */
export default async function CampaignInboxPage({ params }: PageProps<"/app/campaigns/inbox/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/app/campaigns/inbox/${id}`);
  const m = await getActiveMembership(user.id);
  if (!m) notFound();
  const rec = await db.campaignRecipient.findUnique({
    where: { requestId_companyId: { requestId: id, companyId: m.companyId } },
    include: { request: { include: { company: { select: { slug: true, legalName: true, tradeName: true } } } } },
  });
  if (!rec) notFound();
  if (!rec.viewedAt) await db.campaignRecipient.update({ where: { id: rec.id }, data: { viewedAt: new Date() } });
  const r = rec.request;
  const canReply = hasPermission(m, "responses.manage");
  // After replying, the negotiation with the campaign's company is one click away.
  const chat = rec.repliedAt
    ? await db.conversation.findFirst({
        where: { offerId: null, AND: [{ participants: { some: { companyId: m.companyId } } }, { participants: { some: { companyId: r.companyId } } }] },
        select: { id: true },
      })
    : null;

  return (
    <>
      <PageHeader
        eyebrow={ka.sgba.campInboxTitle}
        title={r.title}
        text={<>{ka.sgba.campFrom2}: <Link href={`/companies/${r.company.slug}`} className="font-medium text-accent-strong hover:underline">{companyName(r.company)}</Link></>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-[16px] border border-line bg-surface p-6">
          {r.perk && <div className="mb-4 flex items-center justify-between rounded-[12px] bg-blue-soft px-4 py-3"><span className="text-sm text-secondary">{ka.sgba.specialCondition}</span><span className="font-bold text-accent">{r.perk}</span></div>}
          <p className="whitespace-pre-line text-sm leading-relaxed text-secondary">{r.message}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {r.ctaUrl && <a href={r.ctaUrl} target="_blank" rel="noopener noreferrer" className="text-accent-strong hover:underline">{r.ctaUrl}</a>}
            {r.fileUrl && <a href={r.fileUrl} target="_blank" className="inline-flex items-center gap-1.5 text-accent-strong hover:underline"><Icon name="folder" size={15} /> {r.fileName}</a>}
          </div>
        </section>
        <section className="h-fit rounded-[16px] border border-line bg-surface p-6">
          {rec.repliedAt ? (
            <div className="space-y-3">
              <p className="text-sm text-success">{ka.sgba.campReplied}</p>
              {chat && <Link href={`/app/conversations/${chat.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline">{ka.sgba.campOpenChat} <Icon name="arrow" size={15} /></Link>}
            </div>
          ) : r.status === "RUNNING" && !canReply ? (
            <p className="text-sm text-muted">{ka.offer.noRespondPermission}</p>
          ) : r.status === "RUNNING" ? (
            <ActionForm action={replyToCampaignAction} className="space-y-3">
              <input type="hidden" name="requestId" value={r.id} />
              <Field label={ka.sgba.campReply} name="message">
                <Textarea name="message" rows={4} placeholder={ka.sgba.campReplyPlaceholder} required />
              </Field>
              <SubmitButton className="w-full">{ka.sgba.startDeal}</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">{ka.sgba.campStatus[r.status]}</p>
          )}
        </section>
      </div>
    </>
  );
}
