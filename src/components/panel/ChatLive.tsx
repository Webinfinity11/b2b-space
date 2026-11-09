"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { markConversationReadAction } from "@/actions/chat";

/**
 * Keeps an open conversation fresh. MVP uses polling (router.refresh); swap for
 * WebSocket/Pusher/Ably later without touching the page.
 */
export function ChatLive({ conversationId, lastMessageId, intervalMs = 5000 }: { conversationId: string; lastMessageId: string | null; intervalMs?: number }) {
  const router = useRouter();
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    markConversationReadAction(conversationId).catch(() => {});
    bottom.current?.scrollIntoView({ block: "end" });
  }, [conversationId, lastMessageId]);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return <div ref={bottom} />;
}
