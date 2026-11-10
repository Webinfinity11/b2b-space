import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { cancelCampaignAction } from "@/actions/campaigns";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { audienceWhere } from "@/lib/campaigns";
import { db } from "@/lib/db";
import { param } from "@/lib/params";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { CampaignDetail } from "@/components/panel/CampaignDetail";

export const metadata: Metadata = { title: ka.sgba.campFormTitle };

/** The requester's view of one campaign application: status, price/payment, audience, results. */
export default async function CampaignRequestPage({ params, searchParams }: PageProps<"/app/campaigns/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/app/campaigns/${id}`);
  const m = await getActiveMembership(user.id);
  const r = await db.campaignRequest.findFirst({ where: { id, companyId: m?.companyId ?? "__none__" } });
  if (!r) notFound();
  const sent = param((await searchParams).sent) === "1";
  const [industries, reach, recipients, views, replies] = await Promise.all([
    r.industryIds.length ? db.category.findMany({ where: { id: { in: r.industryIds } }, select: { name: true } }) : [],
    db.company.count({ where: audienceWhere(r) }),
    db.campaignRecipient.count({ where: { requestId: r.id } }),
    db.campaignRecipient.count({ where: { requestId: r.id, viewedAt: { not: null } } }),
    db.campaignRecipient.count({ where: { requestId: r.id, repliedAt: { not: null } } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={ka.sgba.campEyebrow}
        title={ka.sgba.campFormTitle}
        action={<Link href="/app/campaigns" className="text-sm font-medium text-accent-strong hover:underline">← {ka.sgba.campBack}</Link>}
      />
      {sent && <p role="status" className="mb-5 rounded-[12px] border border-success/30 bg-success/10 px-4 py-3 text-sm">{ka.sgba.campSentNotice}</p>}
      {r.status === "APPROVED" && <p className="mb-5 rounded-[12px] border border-[#f3d48a] bg-[#fdf3dc] px-4 py-3 text-sm text-[#8a5a10]">{ka.sgba.campPayInfo}</p>}
      <CampaignDetail
        r={r}
        industries={industries.map((i) => i.name)}
        reach={reach}
        results={["RUNNING", "DONE"].includes(r.status) ? { recipients, views, replies } : undefined}
      />
      {(r.status === "NEW" || r.status === "IN_PROGRESS") && (
        <form action={cancelCampaignAction} className="mt-5">
          <input type="hidden" name="requestId" value={r.id} />
          <Button type="submit" variant="ghost" className="text-danger">{ka.sgba.campCancel}</Button>
        </form>
      )}
    </>
  );
}
