"use client";

import { ka } from "@/i18n/ka";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="text-2xl font-semibold">{ka.errors.errorTitle}</h1>
      <p className="max-w-md text-muted">{ka.errors.errorText}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>{ka.errors.retry}</Button>
        <ButtonLink href="/" variant="secondary">{ka.errors.home}</ButtonLink>
      </div>
    </div>
  );
}
