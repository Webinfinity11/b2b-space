import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { decideCompanyAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { companyName } from "@/lib/public";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Select, SubmitButton, Textarea } from "@/components/ui/Form";
import { VerificationBadge } from "@/components/panel/StatusBadges";
import { VerificationHistory } from "@/components/panel/VerificationHistory";

export const metadata: Metadata = { title: ka.admin.verification };

const STATUSES = ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"] as const;

export default async function AdminCompanyPage({ params }: PageProps<"/admin/companies/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const c = await db.company.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      members: { where: { status: "ACTIVE" }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
      verificationDocuments: { orderBy: { createdAt: "desc" } },
      verificationDecisions: { orderBy: { createdAt: "desc" }, include: { reviewer: { select: { firstName: true, lastName: true, platformRole: true } } } },
      createdBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!c) notFound();
  const country = ka.countries[c.country as keyof typeof ka.countries] ?? c.country;
  const f = ka.companyForm;

  return (
    <>
      <PageHeader
        title={companyName(c)}
        text={c.legalName}
        action={
          <>
            <VerificationBadge status={c.verificationStatus} />
            <Link href={`/companies/${c.slug}`} target="_blank" className="text-sm text-accent-strong hover:underline">{ka.admin.publicPage} ↗</Link>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={ka.admin.legalData} />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <Row label={f.legalName}>{c.legalName}</Row>
                <Row label={f.tradeName}>{c.tradeName ?? ka.common.none}</Row>
                <Row label={f.registrationNumber}>{c.registrationNumber}</Row>
                <Row label={f.taxNumber}>{c.taxNumber ?? ka.common.none}</Row>
                <Row label={f.country}>{country}</Row>
                <Row label={f.city}>{c.city ?? ka.common.none}</Row>
                <Row label={f.legalAddress}>{c.legalAddress}</Row>
                <Row label={f.website}>{c.website ?? ka.common.none}</Row>
                <Row label={f.contactPerson}>{c.contactPerson}</Row>
                <Row label={f.contactEmail}>{c.contactEmail}</Row>
                <Row label={f.contactPhone}>{c.contactPhone ?? ka.common.none}</Row>
                <Row label={ka.admin.createdBy}>
                  {c.createdBy.firstName} {c.createdBy.lastName} ({c.createdBy.email}) · {formatDate(c.createdAt)}
                </Row>
                <Row label={f.categories}>
                  <div className="flex flex-wrap gap-1.5">
                    {c.categories.map((cc) => <Badge key={cc.categoryId} tone="info">{cc.category.name}</Badge>)}
                    {c.customCategory && <Badge tone="warning">{f.otherCategory}: {c.customCategory}</Badge>}
                  </div>
                </Row>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={ka.verification.documents} />
            <CardBody>
              {c.verificationDocuments.length === 0 ? (
                <p className="text-sm text-muted">{ka.verification.noDocuments}</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {c.verificationDocuments.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <a href={`/api/verification-documents/${d.id}`} target="_blank" className="min-w-0 truncate text-accent-strong hover:underline">{d.fileName}</a>
                      <span className="shrink-0 text-xs text-muted">{formatDateTime(d.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={ka.admin.members} />
            <CardBody>
              <ul className="divide-y divide-line">
                {c.members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span>
                      {m.user.firstName} {m.user.lastName} <span className="text-muted">· {m.user.email}{m.user.phone ? ` · ${m.user.phone}` : ""}</span>
                    </span>
                    <Badge tone={m.role === "OWNER" ? "navy" : "neutral"}>{ka.enums.memberRole[m.role]}</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={ka.admin.decide} />
            <CardBody>
              <ActionForm action={decideCompanyAction} className="space-y-4">
                <input type="hidden" name="companyId" value={c.id} />
                <Field label={ka.admin.newStatus} name="status">
                  <Select
                    name="status"
                    placeholder="—"
                    options={STATUSES.filter((s) => s !== c.verificationStatus).map((s) => ({ value: s, label: ka.enums.verificationStatus[s] }))}
                  />
                </Field>
                <Field label={ka.common.comment} name="comment" hint={ka.admin.commentRequired}>
                  <Textarea name="comment" rows={4} maxLength={2000} />
                </Field>
                <SubmitButton className="w-full">{ka.common.save}</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ka.verification.history} />
            <CardBody>
              <VerificationHistory decisions={c.verificationDecisions} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}
