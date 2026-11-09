import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { updateCompanySettingsAction } from "@/actions/company";
import { requireCompany } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, SubmitButton } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.companySettings.title };

export default async function CompanySettingsPage() {
  const { membership } = await requireCompany("owner");
  const company = await db.company.findUniqueOrThrow({
    where: { id: membership.companyId },
    select: { id: true, showEmailPublicly: true, showPhonePublicly: true, contactEmail: true, contactPhone: true },
  });
  return (
    <>
      <PageHeader title={ka.companySettings.title} text={ka.companySettings.text} />
      <Card className="max-w-2xl">
        <CardHeader title={ka.companySettings.visibility} />
        <CardBody>
          <ActionForm action={updateCompanySettingsAction} className="space-y-4">
            <input type="hidden" name="companyId" value={company.id} />
            <Checkbox name="showEmailPublicly" defaultChecked={company.showEmailPublicly} label={`${ka.companyForm.showEmail} (${company.contactEmail})`} />
            <Checkbox
              name="showPhonePublicly"
              defaultChecked={company.showPhonePublicly}
              label={`${ka.companyForm.showPhone}${company.contactPhone ? ` (${company.contactPhone})` : ""}`}
            />
            <SubmitButton>{ka.common.save}</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
