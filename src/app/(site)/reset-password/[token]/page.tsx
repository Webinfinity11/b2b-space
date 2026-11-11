import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { resetPasswordAction } from "@/actions/auth";
import { findReset } from "@/lib/password-reset";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";

export const metadata: Metadata = { title: ka.reset.newTitle };

export default async function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  const reset = await findReset(token);
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-card border border-line bg-card p-6 shadow-card">
        <h1 className="text-xl font-semibold">{ka.reset.newTitle}</h1>
        {!reset || reset.user.status !== "ACTIVE" ? (
          <>
            <p className="mt-3 text-sm text-muted">{ka.reset.invalid}</p>
            <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">{ka.reset.forgotLink}</Link>
          </>
        ) : (
          <ActionForm action={resetPasswordAction} className="mt-5 space-y-4">
            <input type="hidden" name="token" value={token} />
            <p className="text-sm text-secondary">{reset.user.email}</p>
            <Field label={ka.auth.password} name="password" hint={ka.auth.passwordHint}>
              <Input name="password" type="password" autoComplete="new-password" required />
            </Field>
            <Field label={ka.auth.passwordConfirm} name="passwordConfirm">
              <Input name="passwordConfirm" type="password" autoComplete="new-password" required />
            </Field>
            <SubmitButton className="w-full">{ka.reset.newSubmit}</SubmitButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
