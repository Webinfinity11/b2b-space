"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ka } from "@/i18n/ka";
import type { FormState } from "@/lib/forms";
import { Button } from "./Button";
import { controlClass } from "./styles";

const FormStateContext = createContext<FormState>({});

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/**
 * Form bound to a server action via useActionState. Fields inside read errors and
 * previously-submitted values from context, so server pages stay simple.
 */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  showSuccess = true,
  toast = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  showSuccess?: boolean;
  /** Success message as a small navy toast (bottom-right, ~2.5s) instead of inline. */
  toast?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  // Every submission returns a new state object → show a fresh toast.
  const [toastKey, setToastKey] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- re-key the toast per result
  useEffect(() => setToastKey((k) => k + 1), [state]);
  return (
    <FormStateContext.Provider value={state}>
      <form ref={ref} action={formAction} className={className} noValidate>
        {state.message && (!state.ok || (showSuccess && !toast)) ? <FormMessage state={state} /> : null}
        {toast && state.ok && state.message ? <Toast key={toastKey} text={state.message} /> : null}
        {children}
      </form>
    </FormStateContext.Provider>
  );
}

export function useFormState() {
  return useContext(FormStateContext);
}

/** Fixed toast that disappears after ~2.5 seconds. */
export function Toast({ text }: { text: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div role="status" className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-[12px] bg-accent px-4 py-3 text-sm font-medium text-white shadow-2xl">
      {text}
    </div>
  );
}

function FormMessage({ state }: { state: FormState }) {
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        state.ok ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"
      }`}
    >
      {state.message}
    </div>
  );
}

const control = controlClass;

export function Field({
  label,
  name,
  hint,
  optional,
  children,
  className = "",
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const state = useFormState();
  const error = state.errors?.[name];
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-muted">({ka.common.optional})</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger" id={`${name}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function useValue(name: string, defaultValue?: string | number | null) {
  const state = useFormState();
  return state.values && name in state.values ? state.values[name] : (defaultValue ?? "");
}

export function Input({ name, defaultValue, className = "", ...props }: Omit<ComponentProps<"input">, "defaultValue"> & { name: string; defaultValue?: string | number | null }) {
  if (props.type === "file") return <FileInput name={name} multiple={props.multiple} accept={props.accept} />;
  return <TextInput name={name} defaultValue={defaultValue} className={className} {...props} />;
}

/** Styled file picker with Georgian labels (native control text follows the browser language). */
function FileInput({ name, multiple, accept }: { name: string; multiple?: boolean; accept?: string }) {
  const state = useFormState();
  const [files, setFiles] = useState<string[]>([]);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    // Form submitted: React resets the native input, so clear the label too.
    setSeen(state);
    setFiles([]);
  }
  const invalid = Boolean(state.errors?.[name]);
  return (
    <label className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-[10px] border border-dashed px-3 py-2 text-sm transition-colors hover:border-accent/50 hover:bg-accent/[0.04] ${invalid ? "border-danger" : "border-line"}`}>
      <input
        id={name}
        name={name}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))}
      />
      <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        {multiple ? ka.common.chooseFiles : ka.common.chooseFile}
      </span>
      <span className="min-w-0 truncate text-xs text-muted">
        {files.length === 0 ? ka.common.noFile : files.length === 1 ? files[0] : ka.common.filesChosen(files.length)}
      </span>
    </label>
  );
}

function TextInput({ name, defaultValue, className = "", ...props }: Omit<ComponentProps<"input">, "defaultValue"> & { name: string; defaultValue?: string | number | null }) {
  const state = useFormState();
  const value = useValue(name, defaultValue as string | number | null | undefined);
  const invalid = Boolean(state.errors?.[name]);
  return (
    <input
      id={name}
      name={name}
      key={`${name}-${String(value)}`}
      defaultValue={props.type === "password" || props.type === "file" ? undefined : value}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${name}-error` : undefined}
      className={`${control} h-10 ${invalid ? "border-danger" : ""} ${className}`}
      {...props}
    />
  );
}

export function Textarea({ name, defaultValue, className = "", ...props }: Omit<ComponentProps<"textarea">, "defaultValue"> & { name: string; defaultValue?: string | null }) {
  const state = useFormState();
  const value = useValue(name, defaultValue);
  const invalid = Boolean(state.errors?.[name]);
  return (
    <textarea
      id={name}
      name={name}
      key={`${name}-${String(value).length}`}
      defaultValue={value}
      rows={5}
      aria-invalid={invalid || undefined}
      className={`${control} py-2 ${invalid ? "border-danger" : ""} ${className}`}
      {...props}
    />
  );
}

export function Select({
  name,
  defaultValue,
  options,
  placeholder,
  className = "",
  ...props
}: Omit<ComponentProps<"select">, "defaultValue"> & {
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}) {
  const state = useFormState();
  const value = useValue(name, defaultValue);
  const invalid = Boolean(state.errors?.[name]);
  return (
    <select
      id={name}
      name={name}
      key={`${name}-${String(value)}`}
      defaultValue={value}
      aria-invalid={invalid || undefined}
      className={`${control} h-10 ${invalid ? "border-danger" : ""} ${className}`}
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ name, label, defaultChecked, value = "on" }: { name: string; label: ReactNode; defaultChecked?: boolean; value?: string }) {
  const state = useFormState();
  const checked = state.values ? (state.values[name] ?? "").split("|").includes(value) : Boolean(defaultChecked);
  const error = state.errors?.[name];
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
        <input type="checkbox" name={name} value={value} defaultChecked={checked} key={`${name}-${String(checked)}`} className="mt-0.5 size-4 shrink-0" />
        <span>{label}</span>
      </label>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function SubmitButton({ children, variant, size, className, name, value }: { children: ReactNode; variant?: ComponentProps<typeof Button>["variant"]; size?: ComponentProps<typeof Button>["size"]; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={className} name={name} value={value} aria-busy={pending}>
      {pending ? ka.common.loading : children}
    </Button>
  );
}


/** Group of checkboxes sharing one field name (multi-select). */
export function CheckboxGroup({
  name,
  options,
  defaultValues = [],
  columns = 2,
}: {
  name: string;
  options: { value: string; label: string; hint?: string }[];
  defaultValues?: string[];
  columns?: 1 | 2 | 3;
}) {
  const state = useFormState();
  const selected = state.values ? (state.values[name] ?? "").split("|") : defaultValues;
  const cols = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-2 ${cols}`}>
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:border-accent/40">
          <input
            type="checkbox"
            name={name}
            value={o.value}
            defaultChecked={selected.includes(o.value)}
            key={`${o.value}-${selected.includes(o.value)}`}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            {o.label}
            {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
