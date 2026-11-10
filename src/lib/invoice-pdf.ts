import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import { ka } from "@/i18n/ka";
import { formatDate, formatMoney, formatNumber } from "./format";
import type { InvoiceParty, InvoiceSnapshot } from "./invoices";

const FONT_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules", "@expo-google-fonts", "noto-sans-georgian");
const FONT = path.join(FONT_DIR, "400Regular", "NotoSansGeorgian_400Regular.ttf");
const FONT_BOLD = path.join(FONT_DIR, "700Bold", "NotoSansGeorgian_700Bold.ttf");

const NAVY = "#071426";
const ACCENT = "#2f7fb8";
const MUTED = "#64748B";
const LINE = "#E2E8F0";

type Dec = { toString(): string };
export type PdfInvoice = {
  number: string;
  issuedAt: Date;
  dueDate: Date | null;
  currency: string;
  subtotal: Dec;
  discountAmount: Dec;
  taxAmount: Dec;
  deliveryCost: Dec;
  total: Dec;
  paidAmount: Dec;
  paymentTerms: string | null;
  notes: string | null;
  status: string;
  snapshot: InvoiceSnapshot;
  /** Number of the invoice this one corrects, if any. */
  correctsNumber?: string | null;
  items: { name: string; description: string | null; quantity: Dec; unit: string; unitPrice: Dec; lineTotal: Dec }[];
};

/**
 * Server-side invoice PDF with an embedded Georgian Unicode font (Noto Sans Georgian,
 * which also covers Latin, digits and ₾ $ €). Renders only from the frozen snapshot.
 */
export function renderInvoicePdf(inv: PdfInvoice): Promise<Buffer> {
  const i = ka.invoice;
  const t = ka.terms;
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `${i.invoiceWord} ${inv.number}`, Author: ka.brand } });
  doc.registerFont("r", FONT);
  doc.registerFont("b", FONT_BOLD);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const W = doc.page.width - 96;
  const L = 48;
  const money = (v: Dec) => formatMoney(v.toString(), inv.currency);

  // Header band
  doc.rect(0, 0, doc.page.width, 92).fill(NAVY);
  doc.rect(L, 30, 12, 12).fill("#1D45D1");
  doc.rect(L + 14, 30, 12, 12).fill("#FFFFFF");
  doc.rect(L, 44, 12, 12).fill("#FFFFFF");
  doc.rect(L + 14, 44, 12, 12).lineWidth(1.5).stroke("#1D45D1");
  doc.fillColor("#FFFFFF").font("b").fontSize(16).text(ka.brand, L + 36, 34);
  doc.font("b").fontSize(18).text(i.invoiceWord, L, 28, { width: W, align: "right" });
  doc.font("r").fontSize(10).fillColor("#1D45D1").text(inv.number, L, 54, { width: W, align: "right" });

  // Meta
  let y = 116;
  doc.fillColor(MUTED).font("r").fontSize(9);
  const meta: [string, string][] = [
    [i.issuedAt, formatDate(inv.issuedAt)],
    [i.dueDate, inv.dueDate ? formatDate(inv.dueDate) : "—"],
    [i.dealRef, `${t.version(inv.snapshot.deal.versionNumber)} · ${inv.snapshot.deal.dealTermsId}`],
  ];
  if (inv.correctsNumber) meta.push([i.correctsLabelPdf, inv.correctsNumber]);
  for (const [label, value] of meta) {
    doc.fillColor(MUTED).text(label, L, y, { continued: true }).fillColor(NAVY).text(`:  ${value}`);
    y += 14;
  }

  // Parties
  y += 12;
  const colW = (W - 24) / 2;
  const partyBlock = (title: string, p: InvoiceParty, x: number) => {
    let yy = y;
    doc.fillColor(ACCENT).font("b").fontSize(9).text(title, x, yy, { width: colW });
    yy += 16;
    doc.fillColor(NAVY).font("b").fontSize(11).text(p.legalName ?? p.name, x, yy, { width: colW });
    yy = doc.y + 3;
    doc.font("r").fontSize(9).fillColor(NAVY);
    const lines = [
      p.kind === "person" ? i.person : null,
      p.registrationNumber ? `${i.regNumber}: ${p.registrationNumber}` : null,
      p.taxNumber ? `${i.taxNumber}: ${p.taxNumber}` : null,
      p.address ? `${i.address}: ${p.address}` : null,
      [p.email, p.phone].filter(Boolean).join(" · ") || null,
    ].filter(Boolean) as string[];
    for (const line of lines) {
      doc.text(line, x, yy, { width: colW });
      yy = doc.y + 2;
    }
    return yy;
  };
  const yEnd = Math.max(partyBlock(i.seller, inv.snapshot.seller, L), partyBlock(i.buyer, inv.snapshot.buyer, L + colW + 24));
  y = yEnd + 18;

  // Items table
  const cols = [
    { label: t.itemName, w: W * 0.42, align: "left" as const },
    { label: t.quantity, w: W * 0.16, align: "right" as const },
    { label: t.unitPrice, w: W * 0.2, align: "right" as const },
    { label: t.lineTotal, w: W * 0.22, align: "right" as const },
  ];
  doc.rect(L, y, W, 22).fill("#F5F8FC");
  let x = L;
  doc.fillColor(MUTED).font("b").fontSize(8.5);
  for (const c of cols) {
    doc.text(c.label, x + 6, y + 7, { width: c.w - 12, align: c.align });
    x += c.w;
  }
  y += 26;
  doc.font("r").fontSize(9.5).fillColor(NAVY);
  for (const it of inv.items) {
    if (y > doc.page.height - 200) {
      doc.addPage();
      y = 48;
    }
    const startY = y;
    x = L;
    doc.font("b").text(it.name, x + 6, y, { width: cols[0].w - 12 });
    let rowEnd = doc.y;
    if (it.description) {
      doc.font("r").fillColor(MUTED).fontSize(8.5).text(it.description, x + 6, rowEnd + 1, { width: cols[0].w - 12 });
      rowEnd = doc.y;
      doc.fillColor(NAVY).fontSize(9.5);
    }
    x += cols[0].w;
    doc.font("r").text(`${formatNumber(it.quantity.toString())} ${it.unit}`, x + 6, startY, { width: cols[1].w - 12, align: "right" });
    x += cols[1].w;
    doc.text(money(it.unitPrice), x + 6, startY, { width: cols[2].w - 12, align: "right" });
    x += cols[2].w;
    doc.text(money(it.lineTotal), x + 6, startY, { width: cols[3].w - 12, align: "right" });
    y = Math.max(rowEnd, doc.y) + 8;
    doc.moveTo(L, y - 4).lineTo(L + W, y - 4).lineWidth(0.5).stroke(LINE);
  }

  // Totals
  y += 6;
  const tx = L + W * 0.42;
  const tw = W * 0.58;
  const totalRow = (label: string, value: string, bold = false) => {
    doc.font(bold ? "b" : "r").fontSize(bold ? 11 : 9.5);
    const labelW = tw * 0.62;
    const h = doc.heightOfString(label, { width: labelW });
    doc.fillColor(bold ? NAVY : MUTED).text(label, tx, y, { width: labelW });
    doc.fillColor(NAVY).text(value, tx + labelW, y, { width: tw - labelW, align: "right" });
    y += Math.max(h, bold ? 14 : 12) + (bold ? 6 : 4);
  };
  totalRow(t.subtotal, money(inv.subtotal));
  if (Number(inv.discountAmount.toString()) > 0) totalRow(t.discount, `− ${money(inv.discountAmount)}`);
  if (Number(inv.taxAmount.toString()) > 0) totalRow(`${t.tax}${inv.snapshot.taxRatePercent ? ` (${inv.snapshot.taxRatePercent}%)` : ""}`, money(inv.taxAmount));
  if (Number(inv.deliveryCost.toString()) > 0) totalRow(t.deliveryCost, money(inv.deliveryCost));
  doc.moveTo(tx, y).lineTo(L + W, y).lineWidth(1).stroke(NAVY);
  y += 6;
  totalRow(t.total, money(inv.total), true);
  if (Number(inv.paidAmount.toString()) > 0) {
    totalRow(i.paid, money(inv.paidAmount));
    totalRow(i.due, formatMoney(Number(inv.total.toString()) - Number(inv.paidAmount.toString()), inv.currency));
  }

  // Terms & notes
  y += 10;
  const block = (label: string, value: string | null) => {
    if (!value) return;
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 48;
    }
    doc.font("b").fontSize(9).fillColor(MUTED).text(label, L, y, { width: W });
    doc.font("r").fontSize(9.5).fillColor(NAVY).text(value, L, doc.y + 2, { width: W });
    y = doc.y + 10;
  };
  block(t.paymentTerms, inv.paymentTerms);
  block(t.deliveryTerms, inv.snapshot.deliveryTerms);
  block(t.notes, inv.notes);
  block(ka.common.status, ka.enums.invoiceStatus[inv.status as keyof typeof ka.enums.invoiceStatus] ?? inv.status);

  // Footer
  doc.page.margins.bottom = 0; // footer sits inside the bottom margin; avoid an automatic page break
  const fy = doc.page.height - 60;
  doc.moveTo(L, fy).lineTo(L + W, fy).lineWidth(0.5).stroke(LINE);
  doc.font("r").fontSize(8).fillColor(MUTED).text(i.pdfFooter, L, fy + 8, { width: W, align: "center" });

  doc.end();
  return done;
}
