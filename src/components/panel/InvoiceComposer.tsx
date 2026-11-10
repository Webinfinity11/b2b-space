"use client";

import { useEffect, useRef, useState } from "react";
import { ka } from "@/i18n/ka";
import { sendInvoiceAction } from "@/actions/deals";
import { Button } from "@/components/ui/Button";
import { ActionForm, Field, SubmitButton, Textarea, useFormState } from "@/components/ui/Form";
import { controlClass } from "@/components/ui/styles";
import { Icon } from "@/components/ui/Icon";
import { formatAmount } from "@/lib/money";

type Row = { name: string; quantity: string; unitPrice: string; unit?: string; description?: string };
const i18n = ka.invoice;
const num = (s: string) => Number(String(s).replace(",", ".")) || 0;
const fmt = (n: number, cur: string) => formatAmount(n, cur);

/** Inline "create invoice" for the seller, right in the chat. Sends in one click and stays in the chat. */
export function InvoiceComposer({ conversationId, currencies, defaults }: { conversationId: string; currencies: string[]; defaults: { name: string; currency: string; price: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Buttons elsewhere on the page link to #invoice to open this form.
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#invoice") {
        setOpen(true);
        requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  if (!open) {
    return (
      <div id="invoice" ref={ref}>
        <Button type="button" onClick={() => setOpen(true)}>
          <Icon name="invoice" size={16} /> {i18n.composerButton}
        </Button>
      </div>
    );
  }
  return (
    <div id="invoice" ref={ref} className="w-full rounded-lg border border-accent/60 bg-accent/5 p-3">
      <ActionForm action={sendInvoiceAction} resetOnSuccess className="space-y-3">
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="stay" value="1" />
        <Body currencies={currencies} defaults={defaults} onClose={() => setOpen(false)} />
      </ActionForm>
    </div>
  );
}

/** Prefill for an invoice correction (all fields of the original). */
export type InvoiceInitial = {
  rows: Row[];
  currency: string;
  taxRatePercent: string;
  deliveryCost: string;
  discountAmount: string;
  dueDate: string;
  paymentTerms: string;
  notes: string;
};

/** Full-page form that issues a corrected invoice replacing `correctsInvoiceId`. */
export function InvoiceCorrectionForm({ conversationId, correctsInvoiceId, currencies, initial }: { conversationId: string; correctsInvoiceId: string; currencies: string[]; initial: InvoiceInitial }) {
  return (
    <ActionForm action={sendInvoiceAction} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="correctsInvoiceId" value={correctsInvoiceId} />
      <Field label={i18n.correctionReason} name="correctionReason">
        <Textarea name="correctionReason" rows={2} maxLength={1000} />
      </Field>
      <Body currencies={currencies} defaults={{ name: "", currency: initial.currency, price: "" }} initial={initial} submitLabel={i18n.correctionSubmit} />
    </ActionForm>
  );
}

function Body({ currencies, defaults, onClose, initial, submitLabel }: { currencies: string[]; defaults: { name: string; currency: string; price: string }; onClose?: () => void; initial?: InvoiceInitial; submitLabel?: string }) {
  const state = useFormState();
  const [rows, setRows] = useState<Row[]>(initial?.rows ?? [{ name: defaults.name, quantity: "1", unitPrice: defaults.price }]);
  const [currency, setCurrency] = useState(initial?.currency ?? defaults.currency);
  // After a successful send, start from a clean row for the next invoice.
  const [lastOk, setLastOk] = useState(state);
  if (state !== lastOk) {
    setLastOk(state);
    if (state.ok) setRows([{ name: "", quantity: "1", unitPrice: "" }]);
  }
  const total = rows.reduce((s, r) => s + num(r.quantity) * num(r.unitPrice), 0);
  const set = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const cell = `${controlClass} h-9`;
  const err = Object.entries(state.errors ?? {}).filter(([k]) => k.startsWith("items"));

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{initial ? i18n.correctionItems : i18n.composerTitle}</span>
        {onClose && <button
          type="button"
          onClick={() => {
            if (window.location.hash === "#invoice") history.replaceState(null, "", window.location.pathname);
            onClose();
          }}
          className="text-xs text-muted hover:text-ink"
        >{i18n.composerClose} ✕</button>}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <input name="itemName" value={r.name} onChange={(e) => set(i, "name", e.target.value)} placeholder={i18n.composerItemPlaceholder} aria-label={i18n.composerItem} className={`${cell} col-span-12 sm:col-span-6`} />
          <input name="itemQuantity" value={r.quantity} onChange={(e) => set(i, "quantity", e.target.value)} inputMode="decimal" placeholder={i18n.composerQty} aria-label={i18n.composerQty} className={`${cell} col-span-4 sm:col-span-2`} />
          <input name="itemUnitPrice" value={r.unitPrice} onChange={(e) => set(i, "unitPrice", e.target.value)} inputMode="decimal" placeholder={i18n.composerPrice} aria-label={i18n.composerPrice} className={`${cell} col-span-8 sm:col-span-4`} />
          <input type="hidden" name="itemUnit" value={r.unit ?? ""} />
          <input type="hidden" name="itemDescription" value={r.description ?? ""} />
        </div>
      ))}
      {err.length > 0 && <p className="text-xs text-danger">{err[0][1]}</p>}
      <button type="button" onClick={() => setRows((rs) => [...rs, { name: "", quantity: "1", unitPrice: "" }])} className="text-xs font-medium text-accent-strong hover:underline">
        {i18n.composerAddLine}
      </button>

      <details className="rounded-lg bg-surface p-2 text-sm" open={Boolean(initial)}>
        <summary className="cursor-pointer text-xs text-muted">{i18n.composerMore}</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input name="taxRatePercent" inputMode="decimal" defaultValue={initial?.taxRatePercent} placeholder={ka.terms.taxRate} aria-label={ka.terms.taxRate} className={cell} />
          <input name="deliveryCost" inputMode="decimal" defaultValue={initial?.deliveryCost} placeholder={ka.terms.deliveryCost} aria-label={ka.terms.deliveryCost} className={cell} />
          <label className="text-xs text-muted sm:col-span-1">
            {i18n.dueDate}
            <input name="dueDate" type="date" defaultValue={initial?.dueDate} className={`${cell} mt-1`} />
          </label>
          <input name="paymentTerms" defaultValue={initial?.paymentTerms} placeholder={ka.terms.paymentTerms} aria-label={ka.terms.paymentTerms} className={`${cell} self-end`} />
          <input name="notes" defaultValue={initial?.notes} placeholder={ka.terms.notes} aria-label={ka.terms.notes} className={`${cell} sm:col-span-2`} />
        </div>
      </details>
      {/* Fields the server expects but the quick form leaves empty */}
      <input type="hidden" name="discountAmount" value={initial?.discountAmount ?? ""} />
      <input type="hidden" name="deliveryTerms" value="" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${controlClass} h-9 w-auto`} aria-label={ka.terms.currency}>
            {currencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-sm font-semibold tabular-nums text-accent-strong">{fmt(total, currency)}</span>
        </div>
        <SubmitButton>{submitLabel ?? i18n.composerSend}</SubmitButton>
      </div>
    </>
  );
}
