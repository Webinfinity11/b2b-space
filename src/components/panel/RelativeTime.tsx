"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime } from "@/lib/format";

const subscribe = () => () => {};

/** "1 საათის წინ" on the client; the absolute date during SSR (no hydration mismatch). */
export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 60_000), () => 0);
  const d = new Date(date);
  let text = formatDateTime(d);
  if (now) {
    const min = now - Math.floor(d.getTime() / 60_000);
    if (min < 1) text = "ახლახან";
    else if (min < 60) text = `${min} წუთის წინ`;
    else if (min < 24 * 60) text = `${Math.floor(min / 60)} საათის წინ`;
    else if (min < 7 * 24 * 60) text = `${Math.floor(min / 1440)} დღის წინ`;
  }
  return (
    <time dateTime={date} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
