import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { resetPasswordAction } from "@/actions/auth";
import { findReset } from "@/lib/password-reset";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { AuthCard } from "@/components/site/AuthCard";

export const metadata: Metadata = { title: ka.reset.newTitle };

/** Emailed / admin-issued reset link: new password in the same branded card as the login. */
export default async function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  const reset = await findReset(token);
  const valid = reset && reset.user.status === "ACTIVE";
  return (
    <AuthCard title={ka.reset.newTitle} text={valid ? ka.reset.newText : ka.reset.invalid}>
      {valid ? (
        <ActionForm action={resetPasswordAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-secondary">{reset.user.email}</p>
          <Field label={ka.auth.password} name="password" hint={ka.auth.passwordHint}>
            <Input name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label={ka.auth.passwordConfirm} name="passwordConfirm">
            <Input name="passwordConfirm" type="password" autoComplete="new-password" required />
          </Field>
          <SubmitButton className="w-full" size="lg">{ka.reset.newSubmit}</SubmitButton>
        </ActionForm>
      ) : null}
      <div className="mt-5 text-center">
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">{ka.reset.back}</Link>
      </div>
    </AuthCard>
  );
}
