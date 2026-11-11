import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { startDealAction } from "@/actions/chat";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { param } from "@/lib/params";
import { hasPermission } from "@/lib/permissions";
import { companyName } from "@/lib/public";
import { Card, CardBody, PageHeader } from "@/components/ui/Card";
import { ActionForm, Field, Select, SubmitButton, Textarea } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.sgba.newDeal };

/** "+ ახალი მოლაპარაკება": pick a company, write the first message — the negotiation opens. */
export default async function NewDealPage({ searchParams }: PageProps<"/app/conversations/new">) {
  const user = await requireUser("/app/conversations/new");
  const m = await getActiveMembership(user.id);
  if (!m || !hasPermission(m, "responses.manage")) redirect("/app/conversations");
  const preselect = param((await searchParams).company) ?? "";
  const companies = await db.company.findMany({
    where: { verificationStatus: "VERIFIED", id: { not: m.companyId } },
    orderBy: { legalName: "asc" },
    select: { id: true, legalName: true, tradeName: true, city: true },
    take: 1000,
  });
  const s = ka.sgba;
  return (
    <>
      <PageHeader eyebrow={s.dealsEyebrow} title={s.newDeal} text={s.newDealText} action={<Link href="/app/conversations" className="text-sm text-accent-strong hover:underline">← {s.nav.deals}</Link>} />
      <Card className="max-w-2xl">
        <CardBody>
          <ActionForm action={startDealAction} className="space-y-4">
            <Field label={s.newDealCompany} name="companyId">
              <Select
                name="companyId"
                defaultValue={preselect}
                placeholder={s.choose}
                options={companies.map((c) => ({ value: c.id, label: `${companyName(c)}${c.city ? ` · ${c.city}` : ""}` }))}
                required
              />
            </Field>
            <Field label={s.newDealMessage} name="message">
              <Textarea name="message" rows={5} minLength={5} maxLength={3000} required placeholder={s.startDealPlaceholder} />
            </Field>
            <SubmitButton>{s.startDeal}</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
