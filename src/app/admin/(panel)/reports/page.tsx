import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { handleReportAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { param } from "@/lib/params";
import { companyName } from "@/lib/public";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { FilterLinks } from "@/components/ui/Table";

export const metadata: Metadata = { title: ka.reports.adminTitle };

const OPEN = ["OPEN", "IN_REVIEW"] as const;

/** Moderation queue: what was reported, by whom, with a link to the target and a decision form. */
export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin();
  const st = param((await searchParams).status);
  const closed = st === "closed";
  const reports = await db.report.findMany({
    where: { status: closed ? { in: ["RESOLVED", "DISMISSED"] } : { in: [...OPEN] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { reporter: { select: { firstName: true, lastName: true, email: true } }, handledBy: { select: { firstName: true, lastName: true } } },
  });
  // Resolve each target to a title + admin link.
  const ids = (t: string) => reports.filter((r) => r.targetType === t).map((r) => r.targetId);
  const [offers, companies, messages] = await Promise.all([
    db.offer.findMany({ where: { id: { in: ids("OFFER") } }, select: { id: true, title: true } }),
    db.company.findMany({ where: { id: { in: ids("COMPANY") } }, select: { id: true, legalName: true, tradeName: true } }),
    db.message.findMany({ where: { id: { in: ids("MESSAGE") } }, select: { id: true, body: true, conversationId: true } }),
  ]);
  const target = (type: string, id: string): { label: string; href: string | null } => {
    if (type === "OFFER") {
      const o = offers.find((x) => x.id === id);
      return o ? { label: o.title, href: `/admin/offers/${o.id}` } : { label: ka.reports.deleted, href: null };
    }
    if (type === "COMPANY") {
      const c = companies.find((x) => x.id === id);
      return c ? { label: companyName(c), href: `/admin/companies/${c.id}` } : { label: ka.reports.deleted, href: null };
    }
    const m = messages.find((x) => x.id === id);
    return m ? { label: `„${(m.body ?? "").slice(0, 80)}“`, href: `/admin/conversations/${m.conversationId}` } : { label: ka.reports.deleted, href: null };
  };
  const r = ka.reports;

  return (
    <>
      <PageHeader title={r.adminTitle} text={r.adminText} />
      <FilterLinks
        base="/admin/reports"
        param="status"
        current={closed ? "closed" : undefined}
        options={[
          { value: "", label: `${r.status.OPEN} / ${r.status.IN_REVIEW}` },
          { value: "closed", label: `${r.status.RESOLVED} / ${r.status.DISMISSED}` },
        ]}
      />
      {reports.length === 0 ? (
        <EmptyState text={r.empty} />
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => {
            const t = target(rep.targetType, rep.targetId);
            return (
              <Card key={rep.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">{r.target[rep.targetType] ?? rep.targetType}</Badge>
                      {t.href ? <Link href={t.href} className="font-medium text-accent-strong hover:underline">{t.label}</Link> : <span className="text-muted">{t.label}</span>}
                    </div>
                    <Badge tone={rep.status === "OPEN" ? "warning" : rep.status === "RESOLVED" ? "success" : "neutral"}>{r.status[rep.status]}</Badge>
                  </div>
                  <p className="whitespace-pre-line text-sm">{rep.reason}</p>
                  <p className="text-xs text-muted">
                    {r.reporter}: {rep.reporter.firstName} {rep.reporter.lastName} ({rep.reporter.email}) · {formatDateTime(rep.createdAt)}
                    {rep.handledBy ? ` · ${rep.handledBy.firstName} ${rep.handledBy.lastName}` : ""}
                  </p>
                  {rep.resolution && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">{rep.resolution}</p>}
                  {!closed && (
                    <ActionForm action={handleReportAction} toast className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                      <input type="hidden" name="reportId" value={rep.id} />
                      <Field label={r.resolution} name="resolution" optional className="min-w-64 flex-1">
                        <Input name="resolution" maxLength={1000} className="h-9" />
                      </Field>
                      {rep.status === "OPEN" && (
                        <SubmitButton size="sm" variant="secondary" name="status" value="IN_REVIEW">{r.take}</SubmitButton>
                      )}
                      <SubmitButton size="sm" name="status" value="RESOLVED">{r.resolve}</SubmitButton>
                      <SubmitButton size="sm" variant="ghost" name="status" value="DISMISSED">{r.dismiss}</SubmitButton>
                    </ActionForm>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
