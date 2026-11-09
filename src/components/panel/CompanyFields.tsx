import { ka } from "@/i18n/ka";
import type { CategoryNode } from "@/lib/public";
import { CheckboxGroup, Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type Defaults = Partial<
  Record<
    | "legalName"
    | "tradeName"
    | "registrationNumber"
    | "taxNumber"
    | "country"
    | "city"
    | "legalAddress"
    | "description"
    | "activities"
    | "customCategory"
    | "website"
    | "facebookUrl"
    | "linkedinUrl"
    | "instagramUrl"
    | "contactPerson"
    | "contactEmail"
    | "contactPhone",
    string | null
  >
>;

const countryOptions = Object.entries(ka.countries).map(([value, label]) => ({ value, label }));

export function CompanyFields({
  defaults = {},
  categories,
  selectedCategoryIds = [],
  legalLocked = false,
}: {
  defaults?: Defaults;
  categories: CategoryNode[];
  selectedCategoryIds?: string[];
  legalLocked?: boolean;
}) {
  const f = ka.companyForm;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={f.legal} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={f.legalName} name="legalName" className="md:col-span-2">
            <Input name="legalName" defaultValue={defaults.legalName} disabled={legalLocked} required />
          </Field>
          <Field label={f.registrationNumber} name="registrationNumber">
            <Input name="registrationNumber" defaultValue={defaults.registrationNumber} disabled={legalLocked} required />
          </Field>
          <Field label={f.taxNumber} name="taxNumber" optional>
            <Input name="taxNumber" defaultValue={defaults.taxNumber} disabled={legalLocked} />
          </Field>
          <Field label={f.country} name="country">
            <Select name="country" defaultValue={defaults.country ?? "GE"} options={countryOptions} disabled={legalLocked} />
          </Field>
          <Field label={f.city} name="city" optional>
            <Input name="city" defaultValue={defaults.city} />
          </Field>
          <Field label={f.legalAddress} name="legalAddress" className="md:col-span-2">
            <Input name="legalAddress" defaultValue={defaults.legalAddress} required />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={f.publicProfile} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={f.tradeName} name="tradeName" optional className="md:col-span-2">
            <Input name="tradeName" defaultValue={defaults.tradeName} />
          </Field>
          <Field label={f.categories} name="categoryIds" hint={f.categoriesHint} className="md:col-span-2">
            <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-line bg-canvas p-3">
              {categories.map((root) => (
                <div key={root.id}>
                  <div className="mb-2 text-xs font-semibold text-muted">{root.name}</div>
                  <CheckboxGroup
                    name="categoryIds"
                    columns={2}
                    defaultValues={selectedCategoryIds}
                    options={[{ value: root.id, label: root.name }, ...root.children.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                </div>
              ))}
            </div>
          </Field>
          <Field label={f.otherCategory} name="customCategory" optional hint={f.otherCategoryHint} className="md:col-span-2">
            <Input name="customCategory" defaultValue={defaults.customCategory} placeholder={f.otherCategoryPlaceholder} maxLength={80} />
          </Field>
          <Field label={f.description} name="description" optional className="md:col-span-2">
            <Textarea name="description" defaultValue={defaults.description} rows={3} maxLength={1000} />
          </Field>
          <Field label={f.activities} name="activities" optional className="md:col-span-2">
            <Textarea name="activities" defaultValue={defaults.activities} rows={4} maxLength={2000} />
          </Field>
          <Field label={f.website} name="website" optional>
            <Input name="website" defaultValue={defaults.website} placeholder="https://" />
          </Field>
          <Field label={f.facebook} name="facebookUrl" optional>
            <Input name="facebookUrl" defaultValue={defaults.facebookUrl} placeholder="https://facebook.com/..." />
          </Field>
          <Field label={f.linkedin} name="linkedinUrl" optional>
            <Input name="linkedinUrl" defaultValue={defaults.linkedinUrl} placeholder="https://linkedin.com/company/..." />
          </Field>
          <Field label={f.instagram} name="instagramUrl" optional>
            <Input name="instagramUrl" defaultValue={defaults.instagramUrl} placeholder="https://instagram.com/..." />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={f.contacts} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={f.contactPerson} name="contactPerson" className="md:col-span-2">
            <Input name="contactPerson" defaultValue={defaults.contactPerson} required />
          </Field>
          <Field label={f.contactEmail} name="contactEmail">
            <Input name="contactEmail" type="email" defaultValue={defaults.contactEmail} required />
          </Field>
          <Field label={f.contactPhone} name="contactPhone" optional>
            <Input name="contactPhone" type="tel" defaultValue={defaults.contactPhone} />
          </Field>
        </CardBody>
      </Card>
    </div>
  );
}
