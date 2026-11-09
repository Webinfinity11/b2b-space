import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { loginAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/session";
import { param } from "@/lib/params";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { AuthCard } from "@/components/site/AuthCard";

export const metadata: Metadata = { title: ka.auth.loginTitle };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = param((await searchParams).next, 300);
  const user = await getCurrentUser();
  if (user) redirect(user.platformRole === "ADMIN" ? "/admin" : "/app");
  return (
    <AuthCard
      title={ka.auth.loginTitle}
      text={ka.auth.loginText}
      footer={
        <>
          {ka.auth.noAccount}{" "}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-medium text-accent-strong hover:underline">
            {ka.nav.register}
          </Link>
        </>
      }
    >
      <ActionForm action={loginAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <Field label={ka.auth.emailOrLogin} name="email">
          <Input name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        </Field>
        <Field label={ka.auth.password} name="password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full" size="lg">{ka.auth.submitLogin}</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
