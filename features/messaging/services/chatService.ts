import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Message, Profile } from "@/types/database";
import type { ChatSummary } from "@/types/app";

type Client = SupabaseClient<Database>;

const PROFILE_COLUMNS = "id, user_id, name, avatar_url";
export const MESSAGE_PAGE_SIZE = 50;

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}

/**
 * The whole chat list in ONE round trip (see migration 0007). Previously this
 * was six queries plus a 400-message scan on every load.
 */
export async function listChats(client: Client): Promise<ChatSummary[]> {
  const { data, error } = await client.rpc("get_chat_summaries");
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.chat_id,
    lastMessageAt: r.last_message_at,
    otherUser: r.other_id
      ? {
          id: r.other_id,
          user_id: r.other_user_id ?? "",
          name: r.other_name ?? "Unknown",
          avatar_url: r.other_avatar_url
        }
      : null,
    lastMessage: r.last_created_at
      ? {
          content: r.last_content,
          type: (r.last_type as Message["type"]) ?? "text",
          sender_id: r.last_sender_id ?? "",
          created_at: r.last_created_at
        }
      : null,
    unreadCount: 0,
    blocked: r.blocked
  }));
}

/** Latest page of messages, oldest-first, with a "more available" flag. */
export async function getMessages(
  client: Client,
  chatId: string,
  limit = MESSAGE_PAGE_SIZE
): Promise<MessagePage> {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;
  const rows = data ?? [];
  return { messages: rows.slice(0, limit).reverse(), hasMore: rows.length > limit };
}

/** Page of messages older than a timestamp (for scroll-back). */
export async function getOlderMessages(
  client: Client,
  chatId: string,
  beforeIso: string,
  limit = MESSAGE_PAGE_SIZE
): Promise<MessagePage> {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;
  const rows = data ?? [];
  return { messages: rows.slice(0, limit).reverse(), hasMore: rows.length > limit };
}

export async function getChatPartner(client: Client, chatId: string, meId: string) {
  const { data: members } = await client
    .from("chat_members")
    .select("user_id")
    .eq("chat_id", chatId);
  const otherId = (members ?? []).map((m) => m.user_id).find((id) => id !== meId);
  if (!otherId) return null;
  const { data } = await client.from("profiles").select(PROFILE_COLUMNS).eq("id", otherId).single();
  return data ?? null;
}

export async function unhideChat(client: Client, chatId: string, meId: string) {
  await client.from("chat_members").update({ deleted_at: null }).eq("chat_id", chatId).eq("user_id", meId);
}

export async function hideChat(client: Client, chatId: string, meId: string) {
  const { error } = await client
    .from("chat_members")
    .update({ deleted_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("user_id", meId);
  if (error) throw error;
}

export async function sendText(
  client: Client,
  chatId: string,
  senderId: string,
  content: string,
  replyTo?: string | null
) {
  const { data, error } = await client
    .from("messages")
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      type: "text",
      content,
      reply_to_message_id: replyTo ?? null
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Live inserts for one chat. Returns an unsubscribe function. */
export function subscribeToMessages(
  client: Client,
  chatId: string,
  onInsert: (msg: Message) => void
) {
  const channel = client
    .channel(`messages:${chatId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/** Live inserts across the caller's chats (drives the chat list). */
export function subscribeToInbox(
  client: Client,
  onInsert: (msg: Message) => void
) {
  const channel = client
    .channel("inbox")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
