"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatSummary } from "@/types/app";
import { friendlyError } from "@/lib/errors";
import { listChats, subscribeToInbox } from "../services/chatService";

const REFRESH_THROTTLE_MS = 1500;

export function useChats(meId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefresh = useRef(0);

  const reload = useCallback(async () => {
    if (!meId) return;
    try {
      setChats(await listChats(supabase));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [meId, supabase]);

  useEffect(() => {
    if (!meId) {
      setChats([]);
      setLoading(false);
      return;
    }
    reload();

    // A new message updates the list in place — no queries, no flicker.
    const unsub = subscribeToInbox(supabase, (msg) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.chat_id);
        if (idx === -1) {
          // Unknown chat (brand-new conversation): refresh, throttled.
          const now = Date.now();
          if (now - lastRefresh.current > REFRESH_THROTTLE_MS) {
            lastRefresh.current = now;
            void reload();
          }
          return prev;
        }
        const current = prev[idx];
        const updated: ChatSummary = {
          ...current,
          lastMessageAt: msg.created_at,
          lastMessage: {
            content: msg.content,
            type: msg.type,
            sender_id: msg.sender_id,
            created_at: msg.created_at
          }
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    });

    return unsub;
  }, [meId, reload, supabase]);

  return { chats, loading, error, reload };
}
