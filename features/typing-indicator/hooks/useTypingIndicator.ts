"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const STALE_MS = 4000;
const THROTTLE_MS = 1200;

/**
 * Ephemeral typing state over a Realtime broadcast channel.
 * No database row is ever written for typing (spec §7, §25).
 */
export function useTypingIndicator(chatId: string | null, meId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!chatId || !meId) return;

    const channel = supabase.channel(`typing:${chatId}`, {
      config: { broadcast: { self: false } }
    });

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const from = payload?.user_id as string | undefined;
      const isTyping = payload?.typing as boolean | undefined;
      if (!from || from === meId) return;

      clearTimeout(timers.current[from]);
      if (isTyping) {
        setTypingUsers((prev) => (prev.includes(from) ? prev : [...prev, from]));
        timers.current[from] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== from));
        }, STALE_MS);
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== from));
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
      setTypingUsers([]);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId, meId, supabase]);

  const notifyTyping = useCallback(() => {
    if (!meId || !channelRef.current) return;
    const now = Date.now();
    if (now - lastSent.current < THROTTLE_MS) return;
    lastSent.current = now;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: meId, typing: true } });
  }, [meId]);

  const notifyStop = useCallback(() => {
    if (!meId || !channelRef.current) return;
    lastSent.current = 0;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: meId, typing: false } });
  }, [meId]);

  return { typingUsers, notifyTyping, notifyStop };
}
