import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { loginAction, logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { AuthCard } from "@/components/site/AuthCard";

export const metadata: Metadata = { title: ka.admin.loginTitle, robots: { index: false, follow: false } };

/** Separate sign-in for platform admins. Non-admin accounts are rejected here. */
export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.platformRole === "ADMIN") redirect("/admin");
  const c = ka.sgba;

  return (
    <AuthCard
      title={ka.admin.loginTitle}
      text={ka.admin.loginText}
      badge="ADMIN"
      hero={{ eyebrow: c.adminHeroEyebrow, title: c.adminHeroTitle, text: c.adminHeroText, points: c.adminHeroPoints }}
      footer={
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent">
          ← {ka.admin.backToSite}
        </Link>
      }
    >
      {user ? (
        <div className="space-y-4">
          <p className="rounded-[12px] border border-warning/30 bg-warning/10 p-3 text-sm text-ink">{ka.admin.notAdmin}</p>
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
          <SubmitButton className="w-full" size="lg">
            {ka.auth.submitLogin} <Icon name="arrow" size={18} />
          </SubmitButton>
        </ActionForm>
      )}
    </AuthCard>
  );
}
