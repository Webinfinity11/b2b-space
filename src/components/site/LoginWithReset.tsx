"use client";

import { useState, type ReactNode } from "react";
import { ka } from "@/i18n/ka";
import { requestPasswordResetAction } from "@/actions/auth";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";

/**
 * Login form with "forgot password" in place: the link swaps the card to an email field
 * (same card, same style) and back — no separate page.
 */
export function LoginWithReset({ login }: { login: ReactNode }) {
  const [forgot, setForgot] = useState(false);
  if (!forgot) {
    return (
      <div>
        {login}
        <div className="mt-3 text-center">
          <button type="button" onClick={() => setForgot(true)} className="text-sm font-medium text-accent hover:underline">
            {ka.reset.forgotLink}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-lg font-semibold">{ka.reset.title}</h2>
      <p className="mt-1 text-sm text-secondary">{ka.reset.text}</p>
      <ActionForm action={requestPasswordResetAction} className="mt-5 space-y-4">
        <Field label={ka.auth.email} name="email">
          <Input name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <SubmitButton className="w-full" size="lg">{ka.reset.submit}</SubmitButton>
      </ActionForm>
      <div className="mt-4 text-center">
        <button type="button" onClick={() => setForgot(false)} className="text-sm font-medium text-accent hover:underline">
          {ka.reset.back}
        </button>
      </div>
    </div>
  );
}
