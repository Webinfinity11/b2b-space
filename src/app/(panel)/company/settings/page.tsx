import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { requireCompany } from "@/lib/authz";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.companySettings.title };

export default async function CompanySettingsPage() {
  await requireCompany("owner");
  return (
    <>
      <PageHeader title={ka.companySettings.title} text={ka.companySettings.text} />
      <Card className="max-w-2xl">
        <CardHeader title={ka.companySettings.visibility} />
        <CardBody>
          <p className="text-sm text-muted">{ka.company.contactsHidden}</p>
        </CardBody>
      </Card>
    </>
  );
}
