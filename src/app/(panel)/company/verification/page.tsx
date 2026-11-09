import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { submitForVerificationAction, uploadVerificationDocAction } from "@/actions/company";
import { requireCompany } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { VerificationBadge } from "@/components/panel/StatusBadges";
import { VerificationHistory } from "@/components/panel/VerificationHistory";

export const metadata: Metadata = { title: ka.verification.title };

export default async function VerificationPage() {
  const { membership } = await requireCompany("owner");
  const company = await db.company.findUniqueOrThrow({
    where: { id: membership.companyId },
    include: {
      verificationDocuments: { orderBy: { createdAt: "desc" } },
      verificationDecisions: { orderBy: { createdAt: "desc" }, include: { reviewer: { select: { firstName: true, lastName: true, platformRole: true } } } },
    },
  });
  const canUpload = company.verificationStatus !== "VERIFIED" && company.verificationStatus !== "SUSPENDED";
  const canSubmit = company.verificationStatus === "PENDING" || company.verificationStatus === "REJECTED";

  return (
    <>
      <PageHeader title={ka.verification.title} text={ka.verification.text} action={<VerificationBadge status={company.verificationStatus} />} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardBody>
              <p className="text-sm">{ka.verification.statusHint[company.verificationStatus]}</p>
              {canSubmit && (
                <ActionForm action={submitForVerificationAction} className="mt-4">
                  <input type="hidden" name="companyId" value={company.id} />
                  <SubmitButton>{ka.verification.submit}</SubmitButton>
                </ActionForm>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ka.verification.documents} text={ka.verification.documentsHint} />
            <CardBody className="space-y-4">
              {company.verificationDocuments.length === 0 ? (
                <p className="text-sm text-muted">{ka.verification.noDocuments}</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {company.verificationDocuments.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <a href={`/api/verification-documents/${d.id}`} target="_blank" className="min-w-0 truncate text-accent-strong hover:underline">
                        {d.fileName}
                      </a>
                      <span className="shrink-0 text-xs text-muted">{formatDateTime(d.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {canUpload && (
                <ActionForm action={uploadVerificationDocAction} resetOnSuccess className="space-y-3">
                  <input type="hidden" name="companyId" value={company.id} />
                  <Field label={ka.verification.upload} name="documents">
                    <Input name="documents" type="file" multiple accept="application/pdf,image/jpeg,image/png" className="pt-2" />
                  </Field>
                  <SubmitButton variant="secondary">{ka.common.upload}</SubmitButton>
                </ActionForm>
              )}
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title={ka.verification.history} />
          <CardBody>
            <VerificationHistory decisions={company.verificationDecisions} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
