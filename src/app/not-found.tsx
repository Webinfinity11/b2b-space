import { ka } from "@/i18n/ka";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <p className="text-5xl font-semibold text-accent-strong">404</p>
        <h1 className="mt-3 text-2xl font-semibold">{ka.errors.notFoundTitle}</h1>
        <p className="mt-2 text-muted">{ka.errors.notFoundText}</p>
      </div>
      <ButtonLink href="/">{ka.errors.home}</ButtonLink>
    </div>
  );
}
