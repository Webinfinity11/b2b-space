import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { adjustCommissionAction, deleteCommissionRuleAction, saveCommissionRuleAction, settleCommissionAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatAmount } from "@/lib/money";
import { companyName } from "@/lib/public";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, EmptyState, KpiCard, PageHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, CheckboxGroup, Field, Input, Select, SubmitButton } from "@/components/ui/Form";
import { Table, Td } from "@/components/ui/Table";

export const metadata: Metadata = { title: ka.sgba.commissionsAdmin };

type Rule = Awaited<ReturnType<typeof db.commissionRule.findMany>>[number];

export default async function AdminCommissionsPage() {
  await requireAdmin();
  const [rows, rules, categories] = await Promise.all([
    db.commission.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { company: { select: { legalName: true, tradeName: true } }, invoice: { select: { id: true, number: true } }, rule: { select: { title: true } } },
    }),
    db.commissionRule.findMany({ orderBy: { sortOrder: "asc" } }),
    db.category.findMany({ where: { kind: "OFFER", isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const sum = (s: string) => rows.filter((r) => r.status === s && r.currency === "GEL").reduce((a, r) => a + Number(r.amount), 0);
  const f = ka.commissionAdmin;
  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader title={ka.sgba.commissionsAdmin} text={ka.sgba.finText} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <KpiCard label={ka.sgba.finConfirmed} value={formatAmount(sum("CONFIRMED"), "GEL")} hint={ka.sgba.finConfirmedHint} tone="yellow" />
        <KpiCard label={ka.sgba.finSettled} value={formatAmount(sum("SETTLED"), "GEL")} tone="green" />
      </div>

      <Card className="mb-6">
        <CardHeader title={f.rulesTitle} text={f.rulesText} />
        <CardBody className="space-y-3">
          {rules.map((r) => (
            <details key={r.id} className="rounded-[12px] border border-line">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3">
                <span className={`font-medium ${r.isActive ? "" : "text-muted line-through"}`}>{r.title}</span>
                <span className="rounded-full bg-chip px-2 py-0.5 text-xs text-secondary">{r.pct ? `${r.pct.toString()}%` : r.rate}</span>
                {r.isDefault && <span className="rounded-full bg-[#e3f4ec] px-2 py-0.5 text-xs text-[#1b6a4c]">{f.default}</span>}
                {r.minAmount && <span className="text-xs text-muted">{f.fromAmount(formatAmount(Number(r.minAmount), "GEL"))}</span>}
                {r.capAmount && <span className="text-xs text-muted">{f.capShort(formatAmount(Number(r.capAmount), "GEL"))}</span>}
                {r.categoryIds.length > 0 && <span className="text-xs text-muted">{r.categoryIds.map((id) => catName.get(id) ?? "?").join(", ")}</span>}
                <span className="ml-auto text-xs font-medium text-accent">{ka.common.edit}</span>
              </summary>
              <div className="border-t border-line p-4">
                <RuleForm rule={r} catOptions={catOptions} />
                <form action={deleteCommissionRuleAction} className="mt-3 border-t border-line pt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-danger">{ka.common.remove}</Button>
                </form>
              </div>
            </details>
          ))}
          <details className="rounded-[12px] border border-dashed border-line">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-accent-strong">+ {f.addRule}</summary>
            <div className="border-t border-line p-4">
              <RuleForm catOptions={catOptions} nextOrder={(rules.at(-1)?.sortOrder ?? 0) + 10} />
            </div>
          </details>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <EmptyState text={ka.sgba.finHistoryEmpty} />
      ) : (
        <Table head={[ka.nav.companies, ka.invoice.invoiceWord, ka.sgba.colDeal, ka.sgba.colCommission, ka.admin.userStatus, ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>
                {r.company ? companyName(r.company) : "—"}
                <div className="text-xs text-muted">{formatDate(r.createdAt)}</div>
              </Td>
              <Td>
                <Link href={`/admin/invoices/${r.invoice.id}`} className="text-accent-strong hover:underline">{r.invoice.number}</Link>
                {r.number && (
                  <a href={`/api/commissions/${r.id}/pdf`} target="_blank" className="block text-xs text-accent-strong hover:underline">{r.number}</a>
                )}
              </Td>
              <Td className="tabular-nums">
                {formatAmount(Number(r.baseAmount), r.currency)} × {r.pct.toString()}%
                {r.rule && <div className="text-xs text-muted">{r.rule.title}</div>}
              </Td>
              <Td className="font-semibold tabular-nums">{formatAmount(Number(r.amount), r.currency)}</Td>
              <Td>
                {ka.sgba.commissionStatus[r.status]}
                {r.settledAt ? <div className="text-xs text-muted">{formatDate(r.settledAt)}</div> : null}
                {r.note && <div className="max-w-48 text-xs text-muted">{r.note}</div>}
              </Td>
              <Td>
                <div className="flex flex-col items-start gap-2">
                  {r.status === "CONFIRMED" && (
                    <form action={settleCommissionAction}>
                      <input type="hidden" name="commissionId" value={r.id} />
                      <Button type="submit" size="sm" variant="secondary">{ka.sgba.markSettled}</Button>
                    </form>
                  )}
                  {r.status !== "CANCELLED" && (
                    <details>
                      <summary className="cursor-pointer text-xs text-accent-strong">{f.correct}</summary>
                      <ActionForm action={adjustCommissionAction} className="mt-2 w-64 space-y-2" toast>
                        <input type="hidden" name="commissionId" value={r.id} />
                        <Select
                          name="op"
                          defaultValue="amount"
                          options={[
                            { value: "amount", label: f.opAmount },
                            { value: "cancel", label: f.opCancel },
                            ...(r.status === "SETTLED" ? [{ value: "unsettle", label: f.opUnsettle }] : []),
                          ]}
                        />
                        <Field label={f.newAmount} name="amount" optional>
                          <Input name="amount" inputMode="decimal" defaultValue={r.amount.toString()} className="h-9" />
                        </Field>
                        <Field label={f.reason} name="note">
                          <Input name="note" required minLength={3} maxLength={500} className="h-9" />
                        </Field>
                        <SubmitButton size="sm">{ka.common.save}</SubmitButton>
                      </ActionForm>
                    </details>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function RuleForm({ rule, catOptions, nextOrder = 0 }: { rule?: Rule; catOptions: { value: string; label: string }[]; nextOrder?: number }) {
  const f = ka.commissionAdmin;
  return (
    <ActionForm action={saveCommissionRuleAction} resetOnSuccess={!rule} toast className="grid gap-3 md:grid-cols-2">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <input type="hidden" name="sortOrder" value={String(rule?.sortOrder ?? nextOrder)} />
      <Field label={f.title} name="title">
        <Input name="title" defaultValue={rule?.title} required maxLength={120} />
      </Field>
      <Field label={f.rateText} name="rate" hint={f.rateHint}>
        <Input name="rate" defaultValue={rule?.rate} required maxLength={60} />
      </Field>
      <Field label={f.pct} name="pct" optional hint={f.pctHint}>
        <Input name="pct" inputMode="decimal" defaultValue={rule?.pct?.toString() ?? ""} />
      </Field>
      <Field label={f.minAmount} name="minAmount" optional hint={f.minAmountHint}>
        <Input name="minAmount" inputMode="decimal" defaultValue={rule?.minAmount?.toString() ?? ""} />
      </Field>
      <Field label={f.capAmount} name="capAmount" optional hint={f.capHint}>
        <Input name="capAmount" inputMode="decimal" defaultValue={rule?.capAmount?.toString() ?? ""} />
      </Field>
      <div className="space-y-2 pt-6">
        <Checkbox name="isDefault" defaultChecked={rule?.isDefault ?? false} label={f.isDefault} />
        <Checkbox name="isActive" defaultChecked={rule?.isActive ?? true} label={f.isActive} />
      </div>
      <Field label={f.categories} name="categoryIds" optional hint={f.categoriesHint} className="md:col-span-2">
        <CheckboxGroup name="categoryIds" columns={3} options={catOptions} defaultValues={rule?.categoryIds ?? []} />
      </Field>
      <div className="md:col-span-2">
        <SubmitButton size="sm">{ka.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
