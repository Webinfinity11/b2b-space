import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { changePasswordAction, updateEmailPrefsAction, updateProfileAction } from "@/actions/profile";
import { getMemberships, requireUser } from "@/lib/authz";
import { companyName } from "@/lib/public";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { ActionForm, Checkbox, Field, Input, SubmitButton } from "@/components/ui/Form";
import { VerificationBadge } from "@/components/panel/StatusBadges";

export const metadata: Metadata = { title: ka.profile.title };

export default async function ProfilePage() {
  const user = await requireUser("/app/profile");
  const memberships = await getMemberships(user.id);
  return (
    <>
      <PageHeader title={ka.profile.title} text={ka.profile.text} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={ka.profile.personalData} />
          <CardBody>
            <ActionForm action={updateProfileAction} className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-soft text-lg font-bold text-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : `${user.firstName.slice(0, 1)}${user.lastName.slice(0, 1)}`}
                </span>
                <div className="flex-1 space-y-1">
                  <Field label={ka.profile.avatar} name="avatar" optional hint={ka.profile.avatarHint}>
                    <Input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="pt-1.5 text-xs" />
                  </Field>
                  {user.avatarUrl && <Checkbox name="removeAvatar" label={ka.profile.avatarRemove} />}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={ka.auth.firstName} name="firstName">
                  <Input name="firstName" defaultValue={user.firstName} required />
                </Field>
                <Field label={ka.auth.lastName} name="lastName">
                  <Input name="lastName" defaultValue={user.lastName} required />
                </Field>
              </div>
              <Field label={ka.auth.email} name="email" hint={user.emailVerifiedAt ? ka.profile.emailVerified : ka.profile.emailNotVerified}>
                <Input name="email" defaultValue={user.email} disabled />
              </Field>
              <Field label={ka.auth.phone} name="phone" optional>
                <Input name="phone" type="tel" defaultValue={user.phone ?? ""} />
              </Field>
              <SubmitButton>{ka.common.save}</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={ka.profile.security} />
            <CardBody>
              <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-4">
                <Field label={ka.profile.currentPassword} name="currentPassword">
                  <Input name="currentPassword" type="password" autoComplete="current-password" required />
                </Field>
                <Field label={ka.profile.newPassword} name="newPassword" hint={ka.auth.passwordHint}>
                  <Input name="newPassword" type="password" autoComplete="new-password" required />
                </Field>
                <Field label={ka.auth.passwordConfirm} name="passwordConfirm">
                  <Input name="passwordConfirm" type="password" autoComplete="new-password" required />
                </Field>
                <SubmitButton variant="secondary">{ka.common.save}</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ka.email.prefsTitle} text={ka.email.prefsText} />
            <CardBody>
              <ActionForm action={updateEmailPrefsAction} className="space-y-4">
                <Checkbox name="emailNotifications" label={ka.email.prefsLabel} defaultChecked={user.emailNotifications} />
                <SubmitButton variant="secondary">{ka.common.save}</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={ka.profile.memberships} />
            <CardBody>
              {memberships.length === 0 ? (
                <p className="text-sm text-muted">{ka.panel.noCompany}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {memberships.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <span>
                        <span className="block text-sm font-medium">{companyName(m.company)}</span>
                        <span className="block text-xs text-muted">{[m.position?.name, m.department?.name].filter(Boolean).join(" · ") || ka.team.notSet}</span>
                      </span>
                      <span className="flex gap-2">
                        <Badge>{ka.enums.memberRole[m.role]}</Badge>
                        <VerificationBadge status={m.company.verificationStatus} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
