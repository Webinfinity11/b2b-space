import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ka } from "@/i18n/ka";
import { adminCampaignAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { audienceWhere } from "@/lib/campaigns";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { companyName } from "@/lib/public";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/Form";
import { CampaignDetail } from "@/components/panel/CampaignDetail";

export const metadata: Metadata = { title: ka.sgba.campAdminTitle };

export default async function AdminCampaignPage({ params }: PageProps<"/admin/campaigns/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const r = await db.campaignRequest.findUnique({ where: { id }, include: { company: { select: { id: true, legalName: true, tradeName: true } }, package: { select: { title: true, priceFrom: true } } } });
  if (!r) notFound();
  const [industries, positions, reach, recipients, views, replies, requester] = await Promise.all([
    r.industryIds.length ? db.category.findMany({ where: { id: { in: r.industryIds } }, select: { name: true } }) : [],
    r.positionIds.length ? db.category.findMany({ where: { id: { in: r.positionIds } }, select: { name: true } }) : [],
    db.company.count({ where: audienceWhere(r) }),
    db.campaignRecipient.count({ where: { requestId: id } }),
    db.campaignRecipient.count({ where: { requestId: id, viewedAt: { not: null } } }),
    db.campaignRecipient.count({ where: { requestId: id, repliedAt: { not: null } } }),
    db.user.findUnique({ where: { id: r.userId }, select: { firstName: true, lastName: true, email: true, phone: true } }),
  ]);
  const c = ka.sgba;
  const op = (name: string, label: string, variant?: "secondary" | "danger") => (
    <ActionForm action={adminCampaignAction} className="space-y-3" toast>
      <input type="hidden" name="requestId" value={r.id} />
      <input type="hidden" name="op" value={name} />
      {name === "approve" && (
        <Field label={`${c.campPrice} (₾)`} name="price">
          <Input name="price" inputMode="decimal" defaultValue={r.price?.toString() ?? r.package?.priceFrom.toString() ?? ""} required />
        </Field>
      )}
      {(name === "approve" || name === "reject") && (
        <Field label={name === "reject" ? c.campRejectNote : c.adminNote} name="adminNote" optional={name !== "reject"}>
          <Textarea name="adminNote" rows={2} />
        </Field>
      )}
      <SubmitButton className="w-full" variant={variant}>{label}</SubmitButton>
    </ActionForm>
  );

  return (
    <>
      <PageHeader
        title={r.title}
        text={<>{companyName(r.company)} · {formatDateTime(r.createdAt)}{r.package ? ` · ${r.package.title}` : ""}</>}
        action={<Link href="/admin/campaigns" className="text-sm font-medium text-accent-strong hover:underline">← {c.campAdminTitle}</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <CampaignDetail r={r} industries={industries.map((i) => i.name)}
        positions={positions.map((p) => p.name)} reach={reach} results={recipients ? { recipients, views, replies } : undefined} />
        <aside className="space-y-4">
          <Card>
            <CardHeader title={c.applicant} />
            <CardBody className="text-sm">
              <div className="font-medium">{requester ? `${requester.firstName} ${requester.lastName}` : "—"}</div>
              <div className="text-muted">{requester?.email}{requester?.phone ? ` · ${requester.phone}` : ""}</div>
              <Link href={`/admin/companies/${r.company.id}`} className="mt-2 inline-block text-accent-strong hover:underline">{companyName(r.company)} →</Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ka.admin.userStatus} />
            <CardBody className="space-y-4">
              {r.status === "NEW" && op("review", c.campReview, "secondary")}
              {(r.status === "NEW" || r.status === "IN_PROGRESS") && op("approve", c.campApprove)}
              {r.status === "APPROVED" && !r.paidAt && op("paid", c.campMarkPaid)}
              {r.status === "APPROVED" && r.paidAt && <p className="text-sm text-success">✓ {c.campPaidAt(formatDate(r.paidAt))}</p>}
              {r.status === "APPROVED" && r.paidAt && op("launch", c.campLaunch)}
              {r.status === "RUNNING" && op("finish", c.campFinish, "secondary")}
              {["NEW", "IN_PROGRESS", "APPROVED"].includes(r.status) && op("reject", c.campReject, "danger")}
              {(r.status === "DONE" || r.status === "REJECTED") && <p className="text-sm text-muted">{c.campStatus[r.status]}</p>}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
