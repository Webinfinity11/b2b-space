import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { registerAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/session";
import { param } from "@/lib/params";
import { ActionForm, Checkbox, Field, Input, SubmitButton } from "@/components/ui/Form";
import { AuthCard } from "@/components/site/AuthCard";

export const metadata: Metadata = { title: ka.auth.registerTitle };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const next = param((await searchParams).next, 300);
  if (await getCurrentUser()) redirect("/app");
  return (
    <AuthCard
      title={ka.auth.registerTitle}
      text={ka.auth.registerText}
      footer={
        <>
          {ka.auth.haveAccount}{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-accent-strong hover:underline">
            {ka.nav.login}
          </Link>
        </>
      }
    >
      <ActionForm action={registerAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={ka.auth.firstName} name="firstName">
            <Input name="firstName" autoComplete="given-name" required />
          </Field>
          <Field label={ka.auth.lastName} name="lastName">
            <Input name="lastName" autoComplete="family-name" required />
          </Field>
        </div>
        <Field label={ka.auth.email} name="email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={ka.auth.phone} name="phone">
          <Input name="phone" type="tel" autoComplete="tel" placeholder="+995 5XX XX XX XX" required />
        </Field>
        <Field label={ka.auth.password} name="password" hint={ka.auth.passwordHint}>
          <Input name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label={ka.auth.passwordConfirm} name="passwordConfirm">
          <Input name="passwordConfirm" type="password" autoComplete="new-password" required />
        </Field>
        <Checkbox
          name="acceptTerms"
          label={
            <>
              {ka.auth.acceptTerms} (
              <Link href="/terms" target="_blank" className="text-accent-strong hover:underline">{ka.footer.terms}</Link>,{" "}
              <Link href="/privacy" target="_blank" className="text-accent-strong hover:underline">{ka.footer.privacy}</Link>)
            </>
          }
        />
        <SubmitButton className="w-full" size="lg">{ka.auth.submitRegister}</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
