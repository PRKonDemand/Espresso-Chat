"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Profile, Message } from "@/types/database";
import type { OptimisticMessage } from "@/types/app";
import { useMessages } from "@/features/messaging/hooks/useMessages";
import { useTypingIndicator } from "@/features/typing-indicator/hooks/useTypingIndicator";
import { getBlockStatus, blockUser, unblockUser } from "@/features/blocking/services/blockService";
import { getChatPartner, unhideChat } from "@/features/messaging/services/chatService";
import { getCurrentPosition } from "@/features/location-sharing/services/locationService";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyState } from "@/components/ui/EmptyState";

type Row = Message | OptimisticMessage;

export function Conversation({
  chatId,
  meId,
  onBack,
  onDeleted
}: {
  chatId: string;
  meId: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    clearError,
    loadOlder,
    sendTextMessage,
    sendImageMessage,
    sendLocationMessage
  } = useMessages(chatId, meId);
  const { typingUsers, notifyTyping, notifyStop } = useTypingIndicator(chatId, meId);

  const [partner, setPartner] = useState<Pick<Profile, "id" | "name" | "user_id" | "avatar_url"> | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [iBlocked, setIBlocked] = useState(false);
  const [replyTo, setReplyTo] = useState<Row | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const restoreRef = useRef<{ h: number; t: number } | null>(null);

  // Partner + block state.
  useEffect(() => {
    let active = true;
    getChatPartner(supabase, chatId, meId).then((p) => {
      if (!active) return;
      setPartner(p);
      if (p) {
        getBlockStatus(supabase, meId, p.id).then((s) => {
          if (!active) return;
          setBlocked(s.iBlocked || s.theyBlocked);
          setIBlocked(s.iBlocked);
        });
      }
    });
    unhideChat(supabase, chatId, meId).catch(() => {});
    return () => {
      active = false;
    };
  }, [chatId, meId, supabase]);

  // Scroll: jump to newest only when a *new* last message arrives; otherwise
  // preserve position (so loading older messages doesn't yank the viewport).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreRef.current) {
      el.scrollTop = el.scrollHeight - restoreRef.current.h + restoreRef.current.t;
      restoreRef.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    if (last && last.id !== lastIdRef.current) {
      lastIdRef.current = last.id;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleReply = useCallback((m: Row) => setReplyTo(m), []);

  const handleLoadOlder = async () => {
    const el = scrollRef.current;
    restoreRef.current = el ? { h: el.scrollHeight, t: el.scrollTop } : null;
    await loadOlder();
  };

  const sendText = (content: string) => {
    sendTextMessage(content, replyTo?.id ?? null);
    setReplyTo(null);
    notifyStop();
  };

  const sendImage = (file: File) => {
    sendImageMessage(file, replyTo?.id ?? null);
    setReplyTo(null);
  };

  const sendLocation = async () => {
    try {
      const coords = await getCurrentPosition();
      await sendLocationMessage(coords.latitude, coords.longitude, undefined, replyTo?.id ?? null);
      setReplyTo(null);
    } catch {
      alert("Location permission was denied or unavailable.");
    }
  };

  const toggleBlock = async () => {
    if (!partner) return;
    try {
      if (iBlocked) {
        await unblockUser(supabase, meId, partner.id);
        setIBlocked(false);
        setBlocked(false);
      } else {
        await blockUser(supabase, meId, partner.id);
        setIBlocked(true);
        setBlocked(true);
      }
    } catch (e) {
      alert(friendlyError(e));
    }
  };

  const typingNames = partner && typingUsers.includes(partner.id) ? [partner.name] : [];

  return (
    <section className="espresso-conversation flex h-full min-h-0 flex-col bg-bg" data-open="true">
      <ChatHeader
        partner={partner}
        blocked={blocked}
        onBack={onBack}
        onToggleBlock={toggleBlock}
        onDeleteChat={onDeleted}
      />

      <div ref={scrollRef} className="thin-scrollbar flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted">Loading messages…</div>
        ) : messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Say hello — messages appear instantly." />
        ) : (
          <MessageList
            messages={messages}
            meId={meId}
            onReply={handleReply}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
            onLoadOlder={handleLoadOlder}
          />
        )}
      </div>

      <div className="px-4">
        <TypingIndicator names={typingNames} />
        {error && (
          <button
            type="button"
            onClick={clearError}
            className="mb-1 w-full rounded-lg bg-danger/10 px-3 py-1.5 text-left text-xs text-danger"
          >
            {error} · dismiss
          </button>
        )}
      </div>

      <MessageComposer
        onSendText={sendText}
        onSendImage={sendImage}
        onSendLocation={sendLocation}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTyping={notifyTyping}
        onStopTyping={notifyStop}
        disabled={blocked}
        disabledReason={
          iBlocked
            ? "You blocked this user. Unblock from the menu to continue."
            : "This conversation is unavailable because you've been blocked."
        }
      />
    </section>
  );
}
