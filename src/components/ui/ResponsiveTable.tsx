"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Copies header labels onto cells (data-label) so the table can render as cards on phones. */
export function ResponsiveTable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const apply = () => {
      const heads = [...root.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
      root.querySelectorAll("tbody tr").forEach((tr) => {
        [...tr.children].forEach((td, i) => {
          if (heads[i]) td.setAttribute("data-label", heads[i]);
        });
      });
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return (
    <div ref={ref} className="rtable">
      {children}
    </div>
  );
}
