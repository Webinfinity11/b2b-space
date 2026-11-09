import type { ReactNode } from "react";

export function CatalogShell({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-muted">{text}</p>
        </div>
      </div>
      <div className="mx-auto max-w-site px-4 py-8 sm:px-6">{children}</div>
    </>
  );
}
