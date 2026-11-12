import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { requestCampaignAction } from "@/actions/campaigns";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { CITIES } from "@/lib/cities";
import { db } from "@/lib/db";
import { formatAmount } from "@/lib/money";
import { param } from "@/lib/params";
import { getCategoryTree } from "@/lib/public";
import { getPeopleLists } from "@/lib/people";
import { PageHeader } from "@/components/ui/Card";
import { ActionForm, CheckboxGroup, Field, Input, SubmitButton, Textarea } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.sgba.campFormTitle };

/** Campaign application: package (optional) + audience filters + the offer to deliver. */
export default async function NewCampaignPage({ searchParams }: PageProps<"/app/campaigns/new">) {
  const user = await requireUser("/app/campaigns/new");
  const m = await getActiveMembership(user.id);
  const packageId = param((await searchParams).package);
  const [pkg, industries, total, people] = await Promise.all([
    packageId ? db.campaignPackage.findFirst({ where: { id: packageId, isActive: true } }) : null,
    getCategoryTree("INDUSTRY"),
    db.company.count({ where: { verificationStatus: "VERIFIED", id: { not: m?.companyId ?? "" } } }),
    getPeopleLists(),
  ]);
  const c = ka.sgba;

  return (
    <>
      <PageHeader
        eyebrow={pkg ? pkg.kind : c.campEyebrow}
        title={pkg ? pkg.title : c.campCreate}
        text={c.campFormText}
        action={<Link href="/app/campaigns" className="text-sm font-medium text-accent-strong hover:underline">← {c.campBack}</Link>}
      />
      {!m || !hasPermission(m, "campaigns.manage") ? (
        <p className="text-sm text-muted">{ka.errors.forbidden}</p>
      ) : (
        <ActionForm action={requestCampaignAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {pkg && <input type="hidden" name="packageId" value={pkg.id} />}
          <section className="space-y-4 rounded-[16px] border border-line bg-surface p-6">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">{c.campAudienceTitle}</h2>
              <p className="mt-1 text-xs text-muted">{c.campAudienceHint} {c.campReach(total)}.</p>
            </div>
            {pkg && <p className="rounded-[10px] bg-canvas px-3 py-2 text-sm text-secondary">{pkg.audience} · {pkg.channels} · {c.campFrom(formatAmount(Number(pkg.priceFrom), "GEL"))}</p>}
            <Field label={c.industry} name="industryIds" optional>
              <CheckboxGroup name="industryIds" columns={2} options={industries.map((i) => ({ value: i.id, label: i.name }))} />
            </Field>
            <Field label={c.city} name="cities" optional>
              <CheckboxGroup name="cities" columns={3} options={CITIES.filter((x) => x !== "სხვა").map((x) => ({ value: x, label: x }))} />
            </Field>
            <Field label={c.size} name="sizes" optional>
              <CheckboxGroup name="sizes" columns={3} options={["SMALL", "MEDIUM", "LARGE"].map((s) => ({ value: s, label: c.sizeFull[s] }))} />
            </Field>
            <Field label={c.role} name="roles" optional>
              <CheckboxGroup name="roles" columns={3} options={["BUYER", "SELLER", "BOTH"].map((s) => ({ value: s, label: c.roles[s] }))} />
            </Field>
            <Field label={c.campPositions} name="positionIds" optional hint={c.campPositionsHint}>
              <CheckboxGroup name="positionIds" columns={2} options={people.positions.map((p) => ({ value: p.id, label: p.name }))} />
            </Field>
          </section>

          <section className="space-y-4 rounded-[16px] border border-line bg-surface p-6">
            <h2 className="text-[17px] font-semibold text-ink">{c.campOfferTitle}</h2>
            <Field label={c.campCustomTitle} name="title">
              <Input name="title" defaultValue={pkg?.title} maxLength={120} required />
            </Field>
            <Field label={c.campMessage} name="message">
              <Textarea name="message" rows={6} maxLength={3000} required />
            </Field>
            <Field label={c.specialCondition} name="perk" optional>
              <Input name="perk" placeholder="−20%" maxLength={80} />
            </Field>
            <Field label={c.campCta} name="ctaUrl" optional>
              <Input name="ctaUrl" placeholder="https://" />
            </Field>
            <Field label={c.campFile} name="file" optional>
              <input type="file" name="file" multiple accept=".pdf,image/jpeg,image/png,image/webp" className="block w-full text-sm" />
            </Field>
            <Field label={c.campStart} name="startDate" optional>
              <Input name="startDate" type="date" />
            </Field>
            <SubmitButton className="w-full" size="lg">{c.campSend}</SubmitButton>
          </section>
        </ActionForm>
      )}
    </>
  );
}
