"use client";

import { ka } from "@/i18n/ka";
import { useFormState } from "@/components/ui/Form";

const ROLES = ["EMPLOYEE", "FINANCE", "OWNER"] as const;

/** Role as large radio cards with a one-line explanation of what each role can do. */
export function RolePicker({ name, defaultValue, idPrefix }: { name: string; defaultValue: string; idPrefix: string }) {
  const state = useFormState();
  const current = state.values?.[name] ?? defaultValue;
  return (
    <div className="grid gap-2" key={current}>
      {ROLES.map((r) => (
        <label
          key={r}
          htmlFor={`${idPrefix}-${r}`}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 hover:border-accent has-[:checked]:border-navy has-[:checked]:bg-accent/10"
        >
          <input id={`${idPrefix}-${r}`} type="radio" name={name} value={r} defaultChecked={current === r} className="mt-1 size-4 accent-navy" />
          <span>
            <span className="block text-sm font-semibold">{ka.enums.memberRole[r]}</span>
            <span className="block text-xs text-muted">{ka.team.roleHelp[r]}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
