import { ka } from "@/i18n/ka";
import { createReportAction } from "@/actions/reports";
import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/Form";

/** Small "report" disclosure: sends a complaint about an offer / company / message to the admin queue. */
export function ReportButton({ targetType, targetId }: { targetType: "OFFER" | "COMPANY" | "MESSAGE"; targetId: string }) {
  const r = ka.reports;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-muted hover:text-danger">⚑ {r.button}</summary>
      <ActionForm action={createReportAction} resetOnSuccess className="mt-2 space-y-2 rounded-lg border border-line bg-surface p-3">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <Field label={r.reason} name="reason">
          <Textarea name="reason" rows={3} maxLength={2000} required minLength={10} />
        </Field>
        <SubmitButton size="sm" variant="secondary">{r.send}</SubmitButton>
      </ActionForm>
    </details>
  );
}
