"use client";

import type { ChatSummary } from "@/types/app";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChatListItem } from "./ChatListItem";

export function ChatList({
  chats,
  loading,
  activeId,
  meId,
  onSelect
}: {
  chats: ChatSummary[];
  loading: boolean;
  activeId: string | null;
  meId: string;
  onSelect: (chatId: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <EmptyState
        title="No chats yet"
        description="Search for someone by their User ID to start a conversation."
      />
    );
  }

  return (
    <nav aria-label="Chats" className="flex flex-col gap-0.5 px-2 pb-3">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          active={chat.id === activeId}
          meId={meId}
          onClick={() => onSelect(chat.id)}
        />
      ))}
    </nav>
  );
}
