"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatSummary } from "@/types/app";
import { friendlyError } from "@/lib/errors";
import { listChats, subscribeToInbox } from "../services/chatService";

export function useChats(meId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!meId) return;
    try {
      const rows = await listChats(supabase, meId);
      setChats(rows);
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
    const unsub = subscribeToInbox(supabase, () => {
      reload();
    });
    return unsub;
  }, [meId, reload, supabase]);

  return { chats, loading, error, reload };
}
