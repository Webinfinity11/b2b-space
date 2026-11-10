/** Background jobs for the long-running Node server (Railway). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_JOBS === "1") return;
  const g = globalThis as { __b2bJobs?: boolean };
  if (g.__b2bJobs) return;
  g.__b2bJobs = true;
  const { runInvoiceReminders } = await import("./lib/reminders");
  const tick = () => runInvoiceReminders().catch((e) => console.error("[jobs] invoice reminders failed", e));
  setTimeout(tick, 60_000);
  setInterval(tick, 3 * 60 * 60_000);
}
