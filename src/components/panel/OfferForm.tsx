import { ka } from "@/i18n/ka";
import { saveOfferAction } from "@/actions/offers";
import { CURRENCIES } from "@/lib/currencies";
import type { CategoryNode } from "@/lib/public";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/Form";

export type OfferDefaults = {
  id?: string;
  type: "OFFER" | "REQUEST";
  title?: string;
  description?: string;
  categoryId?: string | null;
  itemKind?: string;
  priceType?: string;
  priceMin?: string | null;
  priceMax?: string | null;
  currency?: string | null;
  quantity?: string | null;
  unit?: string | null;
  deliveryTerms?: string | null;
  perk?: string | null;
  audience?: string | null;
  city?: string | null;
  validUntil?: string | null;
  visibility?: string;
  isAnonymous?: boolean;
  status?: string;
};

const opts = <T extends string>(map: Record<T, string>) => (Object.keys(map) as T[]).map((k) => ({ value: k, label: map[k] }));

export function OfferForm({
  defaults,
  categories,
  publishAs,
  lockedPublisher,
}: {
  defaults: OfferDefaults;
  categories: CategoryNode[];
  publishAs: { value: string; label: string }[];
  lockedPublisher?: string;
}) {
  const f = ka.offerForm;
  const categoryOptions = categories.flatMap((root) => [
    { value: root.id, label: root.name },
    ...root.children.map((c) => ({ value: c.id, label: `— ${c.name}` })),
  ]);
  const isDraft = !defaults.status || defaults.status === "DRAFT";

  return (
    <ActionForm action={saveOfferAction} className="max-w-3xl space-y-6">
      {defaults.id && <input type="hidden" name="offerId" value={defaults.id} />}
      <input type="hidden" name="type" value={defaults.type} />
      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={f.title} name="title" className="md:col-span-2">
            <Input name="title" defaultValue={defaults.title} maxLength={160} required />
          </Field>
          <Field label={f.description} name="description" className="md:col-span-2">
            <Textarea name="description" defaultValue={defaults.description} rows={6} maxLength={5000} required />
          </Field>
          <Field label={f.category} name="categoryId">
            <Select name="categoryId" defaultValue={defaults.categoryId} placeholder="—" options={categoryOptions} />
          </Field>
          <Field label={f.itemKind} name="itemKind">
            <Select name="itemKind" defaultValue={defaults.itemKind ?? "PRODUCT"} options={opts(ka.enums.itemKind)} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={ka.offer.price} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={f.priceType} name="priceType" className="md:col-span-2">
            <Select name="priceType" defaultValue={defaults.priceType ?? "NEGOTIABLE"} options={opts(ka.enums.priceType)} />
          </Field>
          <Field label={f.priceMinRange} name="priceMin" optional>
            <Input name="priceMin" inputMode="decimal" defaultValue={defaults.priceMin} placeholder="0.00" />
          </Field>
          <Field label={f.priceMax} name="priceMax" optional>
            <Input name="priceMax" inputMode="decimal" defaultValue={defaults.priceMax} placeholder="0.00" />
          </Field>
          <Field label={f.currency} name="currency" optional>
            <Select name="currency" defaultValue={defaults.currency ?? "GEL"} placeholder="—" options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={f.quantity} name="quantity" optional>
              <Input name="quantity" inputMode="decimal" defaultValue={defaults.quantity} />
            </Field>
            <Field label={f.unit} name="unit" optional>
              <Input name="unit" defaultValue={defaults.unit} placeholder={f.unitPlaceholder} maxLength={30} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={ka.sgba.specialCondition} name="perk" optional hint={ka.sgba.perkHint}>
            <Input name="perk" defaultValue={defaults.perk} maxLength={80} placeholder="−20%" />
          </Field>
          <Field label={ka.sgba.forWhom} name="audience" optional>
            <Input name="audience" defaultValue={defaults.audience} maxLength={160} placeholder={ka.sgba.audienceHint} />
          </Field>
          <Field label={f.deliveryTerms} name="deliveryTerms" optional className="md:col-span-2">
            <Textarea name="deliveryTerms" defaultValue={defaults.deliveryTerms} rows={3} maxLength={1000} />
          </Field>
          <Field label={f.city} name="city" optional>
            <Input name="city" defaultValue={defaults.city} maxLength={80} />
          </Field>
          <Field label={f.validUntil} name="validUntil" optional>
            <Input name="validUntil" type="date" defaultValue={defaults.validUntil} />
          </Field>
          <Field label={f.images} name="attachments" hint={f.imagesHint} className="md:col-span-2">
            <Input name="attachments" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="pt-2" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={f.publishAs} name="publishAs" hint={publishAs.length === 1 && !lockedPublisher ? f.noCompanyVerified : undefined}>
            {lockedPublisher ? (
              <>
                <input type="hidden" name="publishAs" value="locked" />
                <Input name="publishAsLabel" defaultValue={lockedPublisher} disabled />
              </>
            ) : (
              <Select name="publishAs" defaultValue={publishAs[publishAs.length - 1]?.value} options={publishAs} />
            )}
          </Field>
          <Field label={f.visibility} name="visibility">
            <Select name="visibility" defaultValue={defaults.visibility ?? "PUBLIC"} options={opts(ka.enums.offerVisibility)} />
          </Field>
          <div className="md:col-span-2">
            <Checkbox name="isAnonymous" defaultChecked={defaults.isAnonymous} label={<><span className="font-medium">{f.anonymous}</span><span className="mt-0.5 block text-xs text-muted">{f.anonymousHint}</span></>} />
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {isDraft ? (
          <>
            <SubmitButton variant="secondary" name="intent" value="draft">{f.saveDraft}</SubmitButton>
            <SubmitButton name="intent" value="publish">{f.savePublish}</SubmitButton>
          </>
        ) : (
          <SubmitButton name="intent" value="save">{ka.common.save}</SubmitButton>
        )}
      </div>
    </ActionForm>
  );
}
