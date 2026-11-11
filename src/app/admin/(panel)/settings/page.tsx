import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { saveSettingsAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { getPublicSettings } from "@/lib/settings";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.settings.title };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const s = await getPublicSettings();
  const t = ka.settings;
  return (
    <>
      <PageHeader title={t.title} text={t.text} />
      <ActionForm action={saveSettingsAction} toast className="max-w-3xl space-y-6">
        <Card>
          <CardHeader title={t.contacts} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label={t.contactEmail} name="contactEmail" optional><Input name="contactEmail" type="email" defaultValue={s.contactEmail ?? ""} /></Field>
            <Field label={t.contactPhone} name="contactPhone" optional><Input name="contactPhone" defaultValue={s.contactPhone ?? ""} /></Field>
            <Field label={t.contactAddress} name="contactAddress" optional className="sm:col-span-2"><Input name="contactAddress" defaultValue={s.contactAddress ?? ""} /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t.platform} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label={t.platformLegalName} name="platformLegalName" optional><Input name="platformLegalName" defaultValue={s.platformLegalName ?? ""} /></Field>
            <Field label={t.platformRegNumber} name="platformRegNumber" optional><Input name="platformRegNumber" defaultValue={s.platformRegNumber ?? ""} /></Field>
            <Field label={t.platformAddress} name="platformAddress" optional><Input name="platformAddress" defaultValue={s.platformAddress ?? ""} /></Field>
            <Field label={t.platformIban} name="platformIban" optional><Input name="platformIban" defaultValue={s.platformIban ?? ""} /></Field>
            <Field label={t.commissionDueDays} name="commissionDueDays"><Input name="commissionDueDays" type="number" min={1} max={120} defaultValue={String(s.commissionDueDays ?? 10)} /></Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t.legal} text={t.legalHint} />
          <CardBody className="space-y-4">
            <Field label={t.termsText} name="termsText" optional><Textarea name="termsText" rows={10} defaultValue={s.termsText ?? ""} /></Field>
            <Field label={t.privacyText} name="privacyText" optional><Textarea name="privacyText" rows={10} defaultValue={s.privacyText ?? ""} /></Field>
          </CardBody>
        </Card>
        <div className="flex justify-end"><SubmitButton size="lg">{ka.common.save}</SubmitButton></div>
      </ActionForm>
    </>
  );
}
