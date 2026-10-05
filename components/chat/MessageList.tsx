"use client";

import { useMemo } from "react";
import { dayLabel } from "@/lib/format";
import type { Message } from "@/types/database";
import type { OptimisticMessage } from "@/types/app";
import { SwipeableRow } from "@/features/swipe-to-reply/components/SwipeableRow";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "@/components/ui/EmptyState";

type Row = Message | OptimisticMessage;

export function MessageList({
  messages,
  meId,
  onReply
}: {
  messages: Row[];
  meId: string;
  onReply: (message: Row) => void;
}) {
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const grouped = useMemo(() => {
    const out: { day: string; items: Row[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Say hello — messages appear here instantly."
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-3">
      {grouped.map((group) => (
        <div key={group.day} className="flex flex-col gap-1.5">
          <div className="sticky top-0 z-10 mx-auto rounded-full bg-bubble/90 px-3 py-1 text-xs text-muted backdrop-blur">
            {group.day}
          </div>
          {group.items.map((m) => (
            <SwipeableRow key={m.id} onReply={() => onReply(m)} className="px-3 md:px-4">
              <MessageBubble
                message={m}
                isOwn={m.sender_id === meId}
                repliedTo={m.reply_to_message_id ? byId.get(m.reply_to_message_id) ?? null : null}
                onReply={onReply}
              />
            </SwipeableRow>
          ))}
        </div>
      ))}
    </div>
  );
}
