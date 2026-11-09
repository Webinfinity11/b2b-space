import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { loginAction, logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/session";
import { getTheme } from "@/lib/theme";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = { title: ka.admin.loginTitle, robots: { index: false, follow: false } };

/** Separate sign-in for platform admins. Non-admin accounts are rejected here. */
export default async function AdminLoginPage() {
  const [user, theme] = await Promise.all([getCurrentUser(), getTheme()]);
  if (user?.platformRole === "ADMIN") redirect("/admin");

  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <div className="mx-auto flex w-full max-w-[420px] items-center justify-between">
        <Logo />
        <ThemeToggle initial={theme} />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[420px]">
          <div className="rounded-[18px] border border-line bg-card p-6 shadow-card sm:p-8">
            <h1 className="text-[24px] font-semibold tracking-tight">{ka.admin.loginTitle}</h1>
            <p className="mt-1 text-sm text-secondary">{ka.admin.loginText}</p>
            <div className="mt-6">
              {user ? (
                <div className="space-y-4">
                  <p className="rounded-[10px] border border-warning/30 bg-warning/10 p-3 text-sm text-ink">{ka.admin.notAdmin}</p>
                  <form action={logoutAction}>
                    <SubmitButton className="w-full" size="lg">{ka.admin.logout}</SubmitButton>
                  </form>
                </div>
              ) : (
                <ActionForm action={loginAction} className="space-y-4">
                  <input type="hidden" name="admin" value="1" />
                  <Field label={ka.auth.emailOrLogin} name="email">
                    <Input name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
                  </Field>
                  <Field label={ka.auth.password} name="password">
                    <Input name="password" type="password" autoComplete="current-password" required />
                  </Field>
                  <SubmitButton className="w-full" size="lg">{ka.auth.submitLogin}</SubmitButton>
                </ActionForm>
              )}
            </div>
          </div>
          <p className="mt-5 text-center text-sm">
            <Link href="/" className="text-muted hover:text-accent">← {ka.admin.backToSite}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
