import Link from "next/link";
import { ka } from "@/i18n/ka";
import { loginAction, registerAction } from "@/actions/auth";
import { CITIES } from "@/lib/cities";
import { getCategoryTree } from "@/lib/public";
import { Icon } from "@/components/ui/Icon";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/Form";
import { AuthCard } from "./AuthCard";
import { AuthTabs } from "./AuthTabs";
import { FormSteps } from "./FormSteps";
import { LoginWithReset } from "./LoginWithReset";

/** Sign-in and company registration on one page (tabs). */
export async function AuthScreen({ tab, next, registered, invited, inviteToken, reset }: { tab: "login" | "register"; next?: string; registered?: boolean; invited?: boolean; inviteToken?: string; reset?: boolean }) {
  const categories = invited ? [] : await getCategoryTree();
  const c = ka.sgba;


  const person = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={ka.auth.firstName} name="firstName"><Input name="firstName" autoComplete="given-name" required /></Field>
        <Field label={ka.auth.lastName} name="lastName"><Input name="lastName" autoComplete="family-name" required /></Field>
        <Field label={c.workEmail} name="email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label={ka.auth.phone} name="phone"><Input name="phone" type="tel" autoComplete="tel" placeholder="+995 5XX XX XX XX" required /></Field>
        <Field label={ka.auth.password} name="password" hint={ka.auth.passwordHint}><Input name="password" type="password" autoComplete="new-password" required /></Field>
        <Field label={ka.auth.passwordConfirm} name="passwordConfirm"><Input name="passwordConfirm" type="password" autoComplete="new-password" required /></Field>
      </div>
      <Checkbox
        name="acceptTerms"
        label={
          <>
            {ka.auth.acceptTerms} (
            <Link href="/terms" target="_blank" className="text-accent hover:underline">{ka.footer.terms}</Link>,{" "}
            <Link href="/privacy" target="_blank" className="text-accent hover:underline">{ka.footer.privacy}</Link>)
          </>
        }
      />
    </>
  );

  const login = (
    <>
      {registered && <p role="status" className="mb-5 rounded-[12px] border border-success/30 bg-success/10 p-3 text-sm text-ink">{ka.auth.registeredPending}</p>}
      {reset && <p role="status" className="mb-5 rounded-[12px] border border-success/30 bg-success/10 p-3 text-sm text-ink">{ka.reset.done}</p>}
      <LoginWithReset login={<ActionForm action={loginAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <Field label={c.workEmail} name="email">
          <Input name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        </Field>
        <Field label={ka.auth.password} name="password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full" size="lg">
          {c.enter} <Icon name="arrow" size={18} />
        </SubmitButton>
      </ActionForm>} />
    </>
  );

  const register = invited ? (
    <>
      <div className="mb-5 rounded-[12px] bg-blue-soft px-4 py-3 text-sm text-ink">
        <div className="font-bold">{c.regInvitedTitle}</div>
        <div className="mt-0.5 text-xs text-secondary">{c.regInvitedText}</div>
      </div>
      <ActionForm action={registerAction} className="space-y-4">
        <input type="hidden" name="mode" value="invited" />
        <input type="hidden" name="invite" value={inviteToken ?? ""} />
        {person}
        <SubmitButton className="w-full" size="lg">{ka.auth.submitRegister}</SubmitButton>
      </ActionForm>
      <Link href="/register" className="mt-5 inline-block text-sm font-medium text-accent hover:underline">← {c.backToCompanyReg}</Link>
    </>
  ) : (
    <>
      <p className="mb-6 text-sm leading-relaxed text-secondary">{c.regText}</p>
      <ActionForm action={registerAction}>
        <input type="hidden" name="mode" value="company" />
        <FormSteps
          submit={<SubmitButton className="w-full" size="lg">{c.registerCompany}</SubmitButton>}
          steps={[
            {
              title: c.regCompany,
              content: (
                <>
                  <Field label={ka.companyForm.legalName} name="legalName"><Input name="legalName" required /></Field>
                  <Field label={ka.companyForm.registrationNumber} name="registrationNumber"><Input name="registrationNumber" inputMode="numeric" required /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={c.industry} name="categoryId">
                      <Select name="categoryId" placeholder={c.choose} options={categories.map((x) => ({ value: x.id, label: x.name }))} required />
                    </Field>
                    <Field label={c.city} name="city">
                      <Select name="city" placeholder={c.choose} options={CITIES.map((x) => ({ value: x, label: x }))} required />
                    </Field>
                  </div>
                </>
              ),
            },
            {
              title: c.regActivity,
              content: (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={c.role} name="businessRole">
                      <Select name="businessRole" defaultValue="BOTH" options={["BUYER", "SELLER", "BOTH"].map((r) => ({ value: r, label: c.roles[r] }))} />
                    </Field>
                    <Field label={c.size} name="size">
                      <Select name="size" defaultValue="SMALL" options={["SMALL", "MEDIUM", "LARGE"].map((r) => ({ value: r, label: c.sizeFull[r] }))} />
                    </Field>
                  </div>
                  <Field label={c.direction} name="direction" optional><Input name="direction" placeholder={c.directionHint} /></Field>
                  <Field label={c.legalAddressOptional} name="legalAddress" optional><Input name="legalAddress" /></Field>
                </>
              ),
            },
            { title: c.regPersonShort, content: person },
          ]}
        />
      </ActionForm>
      <p className="mt-5 text-center text-sm text-muted">
        {c.regInvited} <Link href="/register?invited=1" className="font-medium text-accent hover:underline">{c.regInvitedLink}</Link>
      </p>
    </>
  );

  return (
    <AuthCard title={c.cabinet} text={c.cabinetText}>
      <AuthTabs initial={tab} login={login} register={register} />
    </AuthCard>
  );
}
