import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { requestPasswordResetAction } from "@/actions/auth";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.reset.title };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-card border border-line bg-card p-6 shadow-card">
        <h1 className="text-xl font-semibold">{ka.reset.title}</h1>
        <p className="mt-2 text-sm text-secondary">{ka.reset.text}</p>
        <ActionForm action={requestPasswordResetAction} className="mt-5 space-y-4">
          <Field label={ka.auth.email} name="email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton className="w-full">{ka.reset.submit}</SubmitButton>
        </ActionForm>
        <Link href="/login" className="mt-5 inline-block text-sm font-medium text-accent hover:underline">{ka.reset.back}</Link>
      </div>
    </div>
  );
}
