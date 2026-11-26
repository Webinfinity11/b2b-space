import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { requireCompany } from "@/lib/authz";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.companySettings.title };

export default async function CompanySettingsPage() {
  await requireCompany("owner");
  return (
    <div className="form-page mx-auto max-w-2xl">
      <PageHeader title={ka.companySettings.title} text={ka.companySettings.text} />
      <Card>
        <CardHeader title={ka.companySettings.visibility} />
        <CardBody>
          <p className="text-sm text-muted">{ka.company.contactsHidden}</p>
        </CardBody>
      </Card>
    </div>
  );
}
