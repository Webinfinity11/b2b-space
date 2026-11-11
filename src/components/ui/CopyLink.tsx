"use client";

import { useState } from "react";
import { ka } from "@/i18n/ka";

/** A link shown in a read-only field with a "copy" button (e.g. an invitation link to send by chat). */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): the field is selectable by hand.
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={ka.team.inviteLink}
        className="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-surface-2 px-3 text-xs text-secondary"
      />
      <button type="button" onClick={copy} className="h-9 shrink-0 rounded-[10px] border border-line-strong bg-surface px-3 text-xs font-semibold text-ink hover:border-accent/40 hover:bg-chip">
        {copied ? ka.team.copied : ka.team.copy}
      </button>
    </div>
  );
}
