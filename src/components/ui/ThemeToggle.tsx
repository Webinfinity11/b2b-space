"use client";

import { useState } from "react";
import { ka } from "@/i18n/ka";

export const THEME_COOKIE = "b2b_theme";

/** Dark (default) ↔ light. Stored in a cookie so the server renders the chosen theme (no flash). */
export function ThemeToggle({ initial }: { initial: "dark" | "light" }) {
  const [theme, setTheme] = useState(initial);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  };
  const label = theme === "dark" ? ka.theme.toLight : ka.theme.toDark;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-secondary transition-colors hover:border-accent/40 hover:text-ink"
    >
      {theme === "dark" ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
