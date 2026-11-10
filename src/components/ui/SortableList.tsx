"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { ka } from "@/i18n/ka";

type Item = { id: string; content: ReactNode };

/**
 * Drag-and-drop ordering (mouse), with ↑/↓ buttons for keyboard and touch.
 * Every change is saved right away through `onReorder(ids)`.
 */
export function SortableList({ items, onReorder }: { items: Item[]; onReorder: (ids: string[]) => Promise<void> }) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const key = items.map((i) => i.id).join("|");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- server data changed (add/delete)
  useEffect(() => setOrder(key ? key.split("|") : []), [key]);
  const byId = new Map(items.map((i) => [i.id, i]));

  const commit = (next: string[]) => {
    setOrder(next);
    setSaved(false);
    start(async () => {
      await onReorder(next);
      setSaved(true);
    });
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    commit(next);
  };

  return (
    <div>
      <ul className="divide-y divide-line">
        {order.map((id, i) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => {
                setDragging(id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (over !== id) setOver(id);
              }}
              onDragLeave={() => setOver((o) => (o === id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging) move(order.indexOf(dragging), i);
                setDragging(null);
                setOver(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}
              className={`flex items-center gap-2 bg-surface transition-colors ${dragging === id ? "opacity-40" : ""} ${over === id && dragging !== id ? "shadow-[inset_0_2px_0_var(--color-accent)]" : ""}`}
            >
              <span className="cursor-grab select-none px-2 py-3 text-muted active:cursor-grabbing" aria-hidden="true" title={ka.sgba.dragHint}>
                <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor"><circle cx="4" cy="3" r="1.5" /><circle cx="10" cy="3" r="1.5" /><circle cx="4" cy="9" r="1.5" /><circle cx="10" cy="9" r="1.5" /><circle cx="4" cy="15" r="1.5" /><circle cx="10" cy="15" r="1.5" /></svg>
              </span>
              <div className="min-w-0 flex-1">{item.content}</div>
              <div className="flex shrink-0 flex-col pr-2">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="↑" className="px-1.5 text-xs text-muted hover:text-accent disabled:opacity-25">▲</button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} aria-label="↓" className="px-1.5 text-xs text-muted hover:text-accent disabled:opacity-25">▼</button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="px-4 pt-2 text-[11px] text-muted" aria-live="polite">
        {pending ? "…" : saved ? `✓ ${ka.sgba.orderSaved}` : ka.sgba.dragHint}
      </p>
    </div>
  );
}
