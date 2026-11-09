"use client";

import { useState } from "react";
import { ka } from "@/i18n/ka";
import { sendInvoiceAction, sendTermsAction } from "@/actions/deals";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ActionForm, Field, Input, SubmitButton, Textarea, useFormState } from "@/components/ui/Form";
import { controlClass } from "@/components/ui/styles";

type Row = { name: string; description: string; quantity: string; unit: string; unitPrice: string };
export type TermsDefaults = {
  currency: string;
  items: Row[];
  discountAmount: string;
  taxRatePercent: string;
  deliveryTerms: string;
  deliveryCost: string;
  paymentTerms: string;
  validUntil: string;
  notes: string;
};

const t = ka.terms;
const num = (s: string) => {
  const n = Number(String(s).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number, cur: string) => {
  try {
    return new Intl.NumberFormat("ka-GE", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(n);
  } catch {
    return n.toFixed(2);
  }
};

export function TermsForm({
  conversationId,
  defaults,
  currencies,
  mode = "terms",
}: {
  conversationId: string;
  defaults: TermsDefaults;
  currencies: string[];
  mode?: "terms" | "invoice";
}) {
  return (
    <ActionForm action={mode === "invoice" ? sendInvoiceAction : sendTermsAction} className="space-y-6">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Inner defaults={defaults} currencies={currencies} mode={mode} />
    </ActionForm>
  );
}

function Inner({ defaults, currencies, mode }: { defaults: TermsDefaults; currencies: string[]; mode: "terms" | "invoice" }) {
  const state = useFormState();
  const [rows, setRows] = useState<Row[]>(defaults.items.length ? defaults.items : [{ name: "", description: "", quantity: "", unit: "", unitPrice: "" }]);
  const [currency, setCurrency] = useState(defaults.currency);
  const [discount, setDiscount] = useState(defaults.discountAmount);
  const [tax, setTax] = useState(defaults.taxRatePercent);
  const [delivery, setDelivery] = useState(defaults.deliveryCost);

  // Preview only — the server recalculates every amount with exact decimals.
  const subtotal = rows.reduce((s, r) => s + Math.round(num(r.quantity) * num(r.unitPrice) * 100) / 100, 0);
  const taxAmount = tax ? Math.round((subtotal - num(discount)) * num(tax)) / 100 : 0;
  const total = subtotal - num(discount) + taxAmount + num(delivery);

  const update = (i: number, key: keyof Row, value: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const err = (i: number, k: string) => state.errors?.[`items.${i}.${k}`];
  const cell = `${controlClass} h-9`;

  return (
    <>
      <Card>
        <CardHeader title={t.items} />
        <CardBody className="space-y-3">
          {state.errors?.items && <p className="text-sm text-danger">{state.errors.items}</p>}
          {rows.map((r, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="grid gap-2 sm:grid-cols-12">
                <label className="sm:col-span-12">
                  <span className="mb-1 block text-xs text-muted">{t.itemName}</span>
                  <input name="itemName" value={r.name} onChange={(e) => update(i, "name", e.target.value)} className={cell} maxLength={200} />
                  {err(i, "name") && <span className="text-xs text-danger">{err(i, "name")}</span>}
                </label>
                <label className="sm:col-span-12">
                  <span className="mb-1 block text-xs text-muted">{t.itemDescription} ({ka.common.optional})</span>
                  <input name="itemDescription" value={r.description} onChange={(e) => update(i, "description", e.target.value)} className={cell} maxLength={500} />
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-xs text-muted">{t.quantity}</span>
                  <input name="itemQuantity" inputMode="decimal" value={r.quantity} onChange={(e) => update(i, "quantity", e.target.value)} className={cell} />
                  {err(i, "quantity") && <span className="text-xs text-danger">{err(i, "quantity")}</span>}
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-xs text-muted">{t.unit}</span>
                  <input name="itemUnit" value={r.unit} onChange={(e) => update(i, "unit", e.target.value)} className={cell} placeholder={ka.offerForm.unitPlaceholder} maxLength={30} />
                  {err(i, "unit") && <span className="text-xs text-danger">{err(i, "unit")}</span>}
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-xs text-muted">{t.unitPrice}</span>
                  <input name="itemUnitPrice" inputMode="decimal" value={r.unitPrice} onChange={(e) => update(i, "unitPrice", e.target.value)} className={cell} />
                  {err(i, "unitPrice") && <span className="text-xs text-danger">{err(i, "unitPrice")}</span>}
                </label>
                <div className="flex items-end justify-between gap-2 sm:col-span-3">
                  <div>
                    <span className="mb-1 block text-xs text-muted">{t.lineTotal}</span>
                    <span className="text-sm font-medium tabular-nums">{fmt(Math.round(num(r.quantity) * num(r.unitPrice) * 100) / 100, currency)}</span>
                  </div>
                  {rows.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                      {t.removeItem}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { name: "", description: "", quantity: "", unit: rs.at(-1)?.unit ?? "", unitPrice: "" }])}>
            {t.addItem}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label={t.currency} name="currency">
            <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${controlClass} h-10`}>
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label={t.discount} name="discountAmount" optional>
            <input id="discountAmount" name="discountAmount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className={`${controlClass} h-10`} placeholder="0.00" />
          </Field>
          <Field label={t.taxRate} name="taxRatePercent" optional hint={t.taxHint}>
            <input id="taxRatePercent" name="taxRatePercent" inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} className={`${controlClass} h-10`} />
          </Field>
          <Field label={t.deliveryCost} name="deliveryCost" optional>
            <input id="deliveryCost" name="deliveryCost" inputMode="decimal" value={delivery} onChange={(e) => setDelivery(e.target.value)} className={`${controlClass} h-10`} placeholder="0.00" />
          </Field>
          <Field label={t.deliveryTerms} name="deliveryTerms" optional className="md:col-span-2">
            <Textarea name="deliveryTerms" defaultValue={defaults.deliveryTerms} rows={2} maxLength={1000} />
          </Field>
          <Field label={t.paymentTerms} name="paymentTerms" optional className="md:col-span-2">
            <Textarea name="paymentTerms" defaultValue={defaults.paymentTerms} rows={2} maxLength={1000} placeholder="მაგ. 50% წინასწარ, 50% მიწოდებისას" />
          </Field>
          {mode === "invoice" ? (
            <Field label={ka.invoice.dueDate} name="dueDate" optional>
              <Input name="dueDate" type="date" />
            </Field>
          ) : (
            <Field label={t.validUntil} name="validUntil" optional>
              <Input name="validUntil" type="date" defaultValue={defaults.validUntil} />
            </Field>
          )}
          <Field label={t.notes} name="notes" optional className="md:col-span-2">
            <Textarea name="notes" defaultValue={defaults.notes} rows={3} maxLength={2000} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <dl className="ml-auto max-w-sm space-y-1.5 text-sm tabular-nums">
            <Line label={t.subtotal} value={fmt(subtotal, currency)} />
            {num(discount) > 0 && <Line label={t.discount} value={`− ${fmt(num(discount), currency)}`} />}
            {taxAmount > 0 && <Line label={`${t.tax} (${tax}%)`} value={fmt(taxAmount, currency)} />}
            {num(delivery) > 0 && <Line label={t.deliveryCost} value={fmt(num(delivery), currency)} />}
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>{t.total}</dt>
              <dd className="text-accent-strong">{fmt(total, currency)}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <SubmitButton size="lg">{mode === "invoice" ? ka.invoice.send : t.send}</SubmitButton>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

