"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";
import type { OptimisticMessage } from "@/types/app";
import { friendlyError } from "@/lib/errors";
import { getMessages, sendText, subscribeToMessages } from "../services/chatService";
import { uploadImage } from "@/features/image-sharing/services/imageService";

type Row = Message | OptimisticMessage;

export function useMessages(chatId: string | null, meId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tempIds = useRef<Set<string>>(new Set());

  const upsert = useCallback((row: Row) => {
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== row.id);
      return [...withoutTemp, row].sort((a, b) =>
        a.created_at < b.created_at ? -1 : 1
      );
    });
  }, []);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    getMessages(supabase, chatId)
      .then((rows) => active && setMessages(rows))
      .catch((e) => active && setError(friendlyError(e)))
      .finally(() => active && setLoading(false));

    const unsub = subscribeToMessages(supabase, chatId, (msg) => {
      if (active) upsert(msg);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [chatId, supabase, upsert]);

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
      const optimistic: OptimisticMessage = {
        id: tempId,
        chat_id: chatId,
        sender_id: meId,
        type: "text",
        content,
        reply_to_message_id: replyTo ?? null,
        created_at: new Date().toISOString(),
        pending: true
      };
      pushOptimistic(optimistic);
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
    error,
    clearError: () => setError(null),
    sendTextMessage,
    sendImageMessage,
    sendLocationMessage
  };
}
