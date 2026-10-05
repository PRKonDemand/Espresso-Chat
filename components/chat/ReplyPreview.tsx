"use client";

import type { Message } from "@/types/database";
import type { OptimisticMessage } from "@/types/app";

export function ReplyPreview({
  message,
  onCancel
}: {
  message: Message | OptimisticMessage;
  onCancel: () => void;
}) {
  const preview =
    message.type === "image"
      ? "Photo"
      : message.type === "location"
        ? "Location"
        : (message.content ?? "").slice(0, 90);

  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border-l-[3px] border-accent bg-bubble/60 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-accent">Replying to a message</p>
        <p className="truncate text-sm text-muted">{preview}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel reply"
        className="rounded-full p-1 text-muted hover:bg-line/60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
