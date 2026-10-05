"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";
import type { OptimisticMessage } from "@/types/app";
import { friendlyError } from "@/lib/errors";
import {
  getMessages,
  getOlderMessages,
  sendText,
  subscribeToMessages
} from "../services/chatService";
import { uploadImage } from "@/features/image-sharing/services/imageService";

type Row = Message | OptimisticMessage;

export function useMessages(chatId: string | null, meId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tempIds = useRef<Set<string>>(new Set());

  const append = useCallback((row: Row) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === row.id)) return prev;
      return [...prev, row].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    });
  }, []);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      setHasMore(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setMessages([]);

    getMessages(supabase, chatId)
      .then(({ messages: rows, hasMore: more }) => {
        if (!active) return;
        setMessages(rows);
        setHasMore(more);
      })
      .catch((e) => active && setError(friendlyError(e)))
      .finally(() => active && setLoading(false));

    const unsub = subscribeToMessages(supabase, chatId, (msg) => {
      if (active) append(msg);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [chatId, supabase, append]);

  const loadOlder = useCallback(async () => {
    if (!chatId || loadingOlder || !hasMore || messages.length === 0) return;
    const oldest = messages.reduce(
      (min, m) => (m.created_at < min ? m.created_at : min),
      messages[0].created_at
    );
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore: more } = await getOlderMessages(supabase, chatId, oldest);
      setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, loadingOlder, hasMore, messages, supabase]);

  const pushOptimistic = (row: OptimisticMessage) => {
    tempIds.current.add(row.id);
    setMessages((prev) => [...prev, row]);
  };

  const resolveOptimistic = (tempId: string, real: Message) => {
    tempIds.current.delete(tempId);
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
      return [...withoutTemp, real].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    });
  };

  const failOptimistic = (tempId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m))
    );
  };

  const sendTextMessage = useCallback(
    async (content: string, replyTo?: string | null) => {
      if (!chatId || !meId) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      pushOptimistic({
        id: tempId,
        chat_id: chatId,
        sender_id: meId,
        type: "text",
        content,
        reply_to_message_id: replyTo ?? null,
        created_at: new Date().toISOString(),
        pending: true
      });
      try {
        const real = await sendText(supabase, chatId, meId, content, replyTo);
        resolveOptimistic(tempId, real);
      } catch (e) {
        failOptimistic(tempId);
        setError(friendlyError(e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, meId, supabase]
  );

  const sendImageMessage = useCallback(
    async (file: File, replyTo?: string | null) => {
      if (!chatId || !meId) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      const preview = URL.createObjectURL(file);
      pushOptimistic({
        id: tempId,
        chat_id: chatId,
        sender_id: meId,
        type: "image",
        storage_path: preview,
        reply_to_message_id: replyTo ?? null,
        created_at: new Date().toISOString(),
        pending: true
      });
      try {
        const { path, width, height } = await uploadImage(supabase, chatId, meId, file);
        const { data, error: insErr } = await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            sender_id: meId,
            type: "image",
            storage_path: path,
            image_width: width,
            image_height: height,
            reply_to_message_id: replyTo ?? null
          })
          .select("*")
          .single();
        if (insErr) throw insErr;
        resolveOptimistic(tempId, data);
      } catch (e) {
        failOptimistic(tempId);
        setError(friendlyError(e));
      } finally {
        URL.revokeObjectURL(preview);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, meId, supabase]
  );

  const sendLocationMessage = useCallback(
    async (latitude: number, longitude: number, label?: string, replyTo?: string | null) => {
      if (!chatId || !meId) return;
      const tempId = `temp-${crypto.randomUUID()}`;
      pushOptimistic({
        id: tempId,
        chat_id: chatId,
        sender_id: meId,
        type: "location",
        latitude,
        longitude,
        location_label: label ?? null,
        reply_to_message_id: replyTo ?? null,
        created_at: new Date().toISOString(),
        pending: true
      });
      try {
        const { data, error: insErr } = await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            sender_id: meId,
            type: "location",
            latitude,
            longitude,
            location_label: label ?? null,
            reply_to_message_id: replyTo ?? null
          })
          .select("*")
          .single();
        if (insErr) throw insErr;
        resolveOptimistic(tempId, data);
      } catch (e) {
        failOptimistic(tempId);
        setError(friendlyError(e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, meId, supabase]
  );

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    clearError: () => setError(null),
    loadOlder,
    sendTextMessage,
    sendImageMessage,
    sendLocationMessage
  };
}
