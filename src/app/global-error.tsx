"use client";

import { ka } from "@/i18n/ka";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ka">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center" }}>
          <h1>{ka.errors.errorTitle}</h1>
          <p>{ka.errors.errorText}</p>
          <button onClick={reset}>{ka.errors.retry}</button>
        </div>
      </body>
    </html>
  );
}
