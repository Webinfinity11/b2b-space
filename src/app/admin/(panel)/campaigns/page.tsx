import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import Link from "next/link";
import { saveCampaignPackageAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { formatAmount } from "@/lib/money";
import { companyName } from "@/lib/public";
import { CampaignStatusPill } from "@/components/panel/CampaignStatusPill";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.sgba.campAdminTitle };

const ACCENTS = ["violet", "blue", "gold", "teal"].map((v) => ({ value: v, label: v }));
type Pkg = { id: string; kind: string; title: string; audience: string; channels: string; priceFrom: { toString(): string }; accent: string; sortOrder: number; isActive: boolean };

export default async function AdminCampaignsPage() {
  await requireAdmin();
  const [requests, packages] = await Promise.all([
    db.campaignRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { company: { select: { legalName: true, tradeName: true } } } }),
    db.campaignPackage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title={ka.sgba.campAdminTitle} text={ka.sgba.campAdminText} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title={ka.sgba.campRequests} text={String(requests.length)} />
          {requests.length === 0 ? (
            <CardBody><p className="text-sm text-muted">{ka.sgba.campNoRequests}</p></CardBody>
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-ink">{r.title}</div>
                      <div className="text-xs text-muted">{companyName(r.company)} · {formatDateTime(r.createdAt)}</div>
                    </div>
                    <CampaignStatusPill status={r.status} />
                  </div>
                  {r.message && <p className="mt-2 whitespace-pre-line text-sm text-secondary">{r.message}</p>}
                  <Link href={`/admin/campaigns/${r.id}`} className="mt-2 inline-block text-sm font-medium text-accent-strong hover:underline">{ka.sgba.open} →</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={ka.sgba.campPackages} />
            {packages.map((p) => (
              <details key={p.id} className="border-t border-line first:border-t-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span className="font-medium">{p.title}{!p.isActive && <span className="ml-2 text-xs text-warning">({ka.admin.inactive})</span>}</span>
                  <span className="text-muted">{formatAmount(Number(p.priceFrom), "GEL")}</span>
                </summary>
                <div className="border-t border-line bg-canvas/50 px-5 py-4"><PackageForm pkg={p} /></div>
              </details>
            ))}
          </Card>
          <Card>
            <CardHeader title={`${ka.common.add}: ${ka.sgba.campPackages}`} />
            <CardBody><PackageForm /></CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function PackageForm({ pkg }: { pkg?: Pkg }) {
  return (
    <ActionForm action={saveCampaignPackageAction} resetOnSuccess={!pkg} className="grid gap-3 sm:grid-cols-2">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <Field label={ka.sgba.campKind} name="kind"><Input name="kind" defaultValue={pkg?.kind} required /></Field>
      <Field label={ka.sgba.campCustomTitle} name="title"><Input name="title" defaultValue={pkg?.title} required /></Field>
      <Field label={ka.sgba.campAudience} name="audience" className="sm:col-span-2"><Input name="audience" defaultValue={pkg?.audience} required /></Field>
      <Field label={ka.sgba.campChannels} name="channels" className="sm:col-span-2"><Input name="channels" defaultValue={pkg?.channels} required /></Field>
      <Field label={ka.sgba.campPriceFrom} name="priceFrom"><Input name="priceFrom" inputMode="decimal" defaultValue={pkg?.priceFrom.toString()} required /></Field>
      <Field label={ka.sgba.campAccent} name="accent"><Select name="accent" defaultValue={pkg?.accent ?? "blue"} options={ACCENTS} /></Field>
      <Field label={ka.admin.sortOrder} name="sortOrder"><Input name="sortOrder" type="number" min={0} defaultValue={pkg?.sortOrder ?? 0} /></Field>
      <div className="flex items-end"><Checkbox name="isActive" defaultChecked={pkg?.isActive ?? true} label={ka.admin.active} /></div>
      <div className="sm:col-span-2"><SubmitButton size="sm">{ka.common.save}</SubmitButton></div>
    </ActionForm>
  );
}
