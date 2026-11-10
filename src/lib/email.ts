import "server-only";

/**
 * Transactional email. Provider: Resend HTTP API (RESEND_API_KEY + EMAIL_FROM).
 * Without a key, emails are skipped (logged in development) — the app keeps working.
 */

export function appUrl(): string {
  const explicit = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "http://localhost:3040";
}

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple branded layout. All text is Georgian and passed in by the caller. */
export function renderEmail(p: { title: string; body?: string | null; link?: string | null; button: string; footer: string }) {
  const url = p.link ? (p.link.startsWith("http") ? p.link : `${appUrl()}${p.link}`) : null;
  const html = `<!doctype html><html lang="ka"><body style="margin:0;background:#f3f5f9;font-family:'Noto Sans Georgian',Arial,sans-serif;color:#071426">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1d45d1;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:700">B2B Space</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:18px;line-height:1.4">${esc(p.title)}</h1>
${p.body ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;white-space:pre-line">${esc(p.body)}</p>` : ""}
${url ? `<a href="${esc(url)}" style="display:inline-block;background:#1d45d1;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:999px">${esc(p.button)}</a>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e6e9f0;font-size:12px;color:#6b7690">${esc(p.footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [p.title, p.body, url].filter(Boolean).join("\n\n") + `\n\n—\n${p.footer}`;
  return { html, text };
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  if (!emailEnabled()) {
    if (process.env.NODE_ENV !== "production") console.info(`[email skipped — no RESEND_API_KEY] to=${msg.to} subject=${msg.subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[email] ${res.status} ${await res.text().catch(() => "")}`);
    return res.ok;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}
