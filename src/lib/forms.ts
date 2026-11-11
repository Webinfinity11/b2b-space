import { z } from "zod";
import { ka } from "@/i18n/ka";

/** Shape returned by every form server action (used with useActionState). */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

const v = ka.validation;

export const zText = (min = 1, max = 200) =>
  z
    .string({ error: v.required })
    .trim()
    .min(min, { error: min <= 1 ? v.required : v.tooShort(min) })
    .max(max, { error: v.tooLong(max) });

export const zOptionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, { error: v.tooLong(max) })
    .optional()
    .transform((s) => (s ? s : null));

export const zEmail = z
  .string({ error: v.required })
  .trim()
  .toLowerCase()
  .min(1, { error: v.required })
  .pipe(z.email({ error: v.email }));

export const zPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,20}$/, { error: v.phone });

export const zOptionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s : null))
  .refine((s) => s === null || /^\+?[0-9 ()-]{6,20}$/.test(s), { error: v.phone });

export const zOptionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? (/^https?:\/\//i.test(s) ? s : `https://${s}`) : null))
  .refine((s) => s === null || (URL.canParse(s) && /^https?:$/.test(new URL(s).protocol) && new URL(s).hostname.includes(".")), { error: v.url });

export const zPassword = z
  .string({ error: v.required })
  .min(8, { error: v.passwordWeak })
  .max(128, { error: v.tooLong(128) })
  .refine((p) => /[A-Za-zა-ჰ]/.test(p) && /\d/.test(p), { error: v.passwordWeak });

/** Unchecked checkboxes are absent from FormData, so the field must be optional. */
export const zCheckbox = z
  .string()
  .optional()
  .transform((s) => s === "on" || s === "true" || s === "1");

/** Plain object of string fields from FormData (files skipped). */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of formData.entries()) {
    if (typeof val === "string" && !k.startsWith("$ACTION") && !/password/i.test(k)) {
      out[k] = k in out ? `${out[k]}|${val}` : val;
    }
  }
  return out;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError, formData: FormData): FormState {
  return { ok: false, message: v.formErrors, errors: fieldErrors(error), values: formValues(formData) };
}

export function fail(message: string, formData?: FormData, errors?: Record<string, string>): FormState {
  return { ok: false, message, errors, values: formData ? formValues(formData) : undefined };
}
