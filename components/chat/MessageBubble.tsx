"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { clockTime } from "@/lib/format";
import type { Message } from "@/types/database";
import type { OptimisticMessage } from "@/types/app";
import { ImageMessage } from "./ImageMessage";
import { LocationMessage } from "./LocationMessage";

type Row = Message | OptimisticMessage;

export function MessageBubble({
  message,
  isOwn,
  repliedTo,
  onReply
}: {
  message: Row;
  isOwn: boolean;
  repliedTo?: Row | null;
  onReply: (message: Row) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const failed = (message as OptimisticMessage).failed;
  const pending = (message as OptimisticMessage).pending;

  const startPress = () => {
    pressTimer.current = setTimeout(() => setMenuOpen(true), 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const copy = async () => {
    if (message.type === "text" && message.content) {
      await navigator.clipboard.writeText(message.content).catch(() => {});
    }
    setMenuOpen(false);
  };

  return (
    <div
      className={cn("group flex w-full", isOwn ? "justify-end" : "justify-start")}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      <div className={cn("relative flex items-end gap-1", isOwn ? "flex-row" : "flex-row-reverse")}>
        <div
          className={cn(
            "espresso-bubble animate-bubble-in",
            isOwn ? "espresso-bubble--out" : "espresso-bubble--in",
            pending && "espresso-bubble--pending",
            failed && "espresso-bubble--failed"
          )}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onTouchMove={cancelPress}
        >
          {repliedTo && (
            <div className="espresso-reply-quote">
              {repliedTo.type === "text"
                ? (repliedTo.content ?? "").slice(0, 80)
                : repliedTo.type === "image"
                  ? "Photo"
                  : "Location"}
            </div>
          )}

          {message.type === "text" && (
            <p className="whitespace-pre-wrap text-[15px]">{message.content}</p>
          )}
          {message.type === "image" && message.storage_path && (
            <ImageMessage path={message.storage_path} />
          )}
          {message.type === "location" &&
            message.latitude != null &&
            message.longitude != null && (
              <LocationMessage
                latitude={message.latitude}
                longitude={message.longitude}
                label={message.location_label}
              />
            )}

          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[11px]",
              isOwn ? "text-accent-ink/70" : "text-muted"
            )}
          >
            <span>{clockTime(message.created_at)}</span>
            {isOwn && !pending && !failed && <StatusTick />}
            {pending && <span aria-label="Sending">·</span>}
            {failed && <span className="font-medium" aria-label="Failed to send">Failed</span>}
          </div>
        </div>

        {/* Hover / keyboard-accessible reply affordance */}
        <button
          type="button"
          onClick={() => onReply(message)}
          aria-label="Reply to message"
          className={cn(
            "mb-1 rounded-full p-1.5 text-muted opacity-0 transition-opacity",
            "hover:bg-bubble focus-visible:opacity-100 group-hover:opacity-100"
          )}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="espresso-modal-backdrop fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center" onMouseDown={() => setMenuOpen(false)}>
          <div className="espresso-panel w-full max-w-xs p-2" onMouseDown={(e) => e.stopPropagation()}>
            <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-bubble" onClick={() => { onReply(message); setMenuOpen(false); }}>
              Reply
            </button>
            {message.type === "text" && (
              <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-bubble" onClick={copy}>
                Copy text
              </button>
            )}
            <button className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted hover:bg-bubble" onClick={() => setMenuOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusTick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Sent">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
