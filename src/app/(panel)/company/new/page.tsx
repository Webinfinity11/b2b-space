import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { createCompanyAction } from "@/actions/company";
import { requireUser } from "@/lib/authz";
import { getCategoryTree } from "@/lib/public";
import { PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CompanyFields } from "@/components/panel/CompanyFields";

export const metadata: Metadata = { title: ka.companyForm.createTitle };

export default async function NewCompanyPage() {
  const user = await requireUser("/company/new");
  const categories = await getCategoryTree();
  return (
    <>
      <PageHeader title={ka.companyForm.createTitle} text={ka.companyForm.createText} />
      <ActionForm action={createCompanyAction} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader title={ka.companyForm.logo} />
          <CardBody>
            <Field label={ka.companyForm.logo} name="logo" optional hint={ka.companyForm.imageHint}>
              <Input name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="pt-2" />
            </Field>
          </CardBody>
        </Card>
        <CompanyFields
          categories={categories}
          defaults={{ contactPerson: `${user.firstName} ${user.lastName}`, contactEmail: user.email, contactPhone: user.phone }}
        />
        <div className="flex justify-end">
          <SubmitButton size="lg">{ka.companyForm.submitCreate}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
