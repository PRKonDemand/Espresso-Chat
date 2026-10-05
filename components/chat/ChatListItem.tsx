"use client";

import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import type { ChatSummary } from "@/types/app";
import { Avatar } from "@/components/ui/Avatar";

export function ChatListItem({
  chat,
  active,
  meId,
  onClick
}: {
  chat: ChatSummary;
  active: boolean;
  meId: string;
  onClick: () => void;
}) {
  const name = chat.otherUser?.name ?? "Unknown";
  const preview = chat.lastMessage
    ? chat.lastMessage.type === "image"
      ? "Photo"
      : chat.lastMessage.type === "location"
        ? "Location"
        : chat.lastMessage.content ?? ""
    : "No messages yet";

  const mine = chat.lastMessage?.sender_id === meId;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
        active ? "bg-accent/10" : "hover:bg-bubble"
      )}
    >
      <Avatar name={name} src={chat.otherUser?.avatar_url} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {chat.lastMessage && (
            <span className="shrink-0 text-[11px] text-muted">
              {relativeTime(chat.lastMessage.created_at)}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="truncate text-[13px] text-muted">
            {mine && <span className="text-muted/80">You: </span>}
            {preview}
          </span>
          {chat.blocked && (
            <span className="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
              Blocked
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
