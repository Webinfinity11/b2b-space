"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { useFormState } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";

/**
 * Multi-step section of one form (all fields stay in the form, steps are only shown/hidden).
 * "Next" checks the current step's required fields; server errors jump to the step that has them.
 */
export function FormSteps({ steps, submit }: { steps: { title: string; content: ReactNode }[]; submit: ReactNode }) {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const state = useFormState();

  // Server-side validation errors → open the first step that contains a failing field.
  useEffect(() => {
    const names = Object.keys(state.errors ?? {});
    if (!names.length) return;
    const idx = refs.current.findIndex((el) => names.some((n) => el?.querySelector(`[name="${n}"]`)));
    if (idx >= 0) setStep(idx);
  }, [state]);

  const next = () => {
    const el = refs.current[step];
    const fields = el ? Array.from(el.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select, textarea")) : [];
    const bad = fields.find((f) => !f.checkValidity());
    if (bad) {
      bad.reportValidity();
      bad.focus();
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <ol className="mb-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s.title} className="min-w-0">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className="group block w-full text-left disabled:cursor-default"
            >
              <span className={`block h-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
              <span className={`mt-2 flex items-center gap-1.5 text-xs ${i === step ? "font-bold text-ink" : i < step ? "text-accent" : "text-muted"}`}>
                <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${i < step ? "bg-accent text-white" : i === step ? "bg-ink text-surface" : "bg-chip text-muted"}`}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className="truncate">{s.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {steps.map((s, i) => (
        <div key={s.title} ref={(el) => { refs.current[i] = el; }} hidden={i !== step} className="space-y-4">
          {s.content}
        </div>
      ))}

      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex h-12 items-center gap-2 rounded-[12px] border border-line-strong bg-surface px-5 text-sm font-bold text-ink hover:bg-chip">
            ← {ka.sgba.stepBack}
          </button>
        )}
        <div className="flex-1">
          {step < steps.length - 1 ? (
            <button type="button" onClick={next} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-accent px-5 text-[15px] font-bold text-white hover:bg-accent-hover">
              {ka.sgba.stepNext} <Icon name="arrow" size={18} />
            </button>
          ) : (
            submit
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">{ka.sgba.stepOf(step + 1, steps.length)}</p>
    </div>
  );
}
