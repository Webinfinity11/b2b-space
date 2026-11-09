import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { updateCompanyProfileAction } from "@/actions/company";
import { requireCompany } from "@/lib/authz";
import { db } from "@/lib/db";
import { companyName, getCategoryTree } from "@/lib/public";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { CompanyFields } from "@/components/panel/CompanyFields";
import { CompanyLogo } from "@/components/site/CompanyLogo";

export const metadata: Metadata = { title: ka.panel.companyProfile };

export default async function CompanyProfilePage() {
  const { membership } = await requireCompany("company.edit");
  const [company, categories] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: membership.companyId }, include: { categories: true } }),
    getCategoryTree(),
  ]);
  const legalLocked = company.verificationStatus === "VERIFIED" || company.verificationStatus === "IN_REVIEW";
  const name = companyName(company);

  return (
    <>
      <PageHeader
        title={ka.panel.companyProfile}
        text={name}
        action={
          <Link href={`/companies/${company.slug}`} className="text-sm text-accent-strong hover:underline" target="_blank">
            {ka.admin.publicPage} ↗
          </Link>
        }
      />
      <ActionForm action={updateCompanyProfileAction} className="max-w-3xl space-y-6">
        <input type="hidden" name="companyId" value={company.id} />
        {legalLocked && (
          <>
            {/* Disabled inputs are not submitted; legal fields are ignored server-side while locked. */}
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">{ka.verification.lockedVerified}</p>
          </>
        )}
        <Card>
          <CardHeader title={ka.companyForm.logo} />
          <CardBody>
            <div className="flex items-center gap-4">
              <CompanyLogo name={name} url={company.logoUrl} size={64} />
              <Field label={ka.companyForm.logo} name="logo" hint={ka.companyForm.imageHint} className="flex-1">
                <Input name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="pt-2" />
              </Field>
            </div>
          </CardBody>
        </Card>
        <CompanyFields
          categories={categories}
          legalLocked={legalLocked}
          selectedCategoryIds={company.categories.map((c) => c.categoryId)}
          defaults={company}
        />
        <div className="flex justify-end">
          <SubmitButton size="lg">{ka.common.save}</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
