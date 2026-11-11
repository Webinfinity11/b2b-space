"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markNotificationReadAction } from "@/actions/panel";

/**
 * Goes straight to what the notification points at and marks it read in the background
 * (no redirect hop — client navigation can't follow a route-handler redirect).
 */
export function NotificationLink({ id, href, unread, className, children }: { id: string; href: string; unread: boolean; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (unread) void markNotificationReadAction(id);
      }}
    >
      {children}
    </Link>
  );
}
