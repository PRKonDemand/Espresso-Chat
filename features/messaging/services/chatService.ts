import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Message, Profile } from "@/types/database";
import type { ChatSummary } from "@/types/app";

type Client = SupabaseClient<Database>;

const PROFILE_COLUMNS = "id, user_id, name, avatar_url";

/**
 * Load the caller's chat list: membership, the other participant, the last
 * message, and whether a block exists between the two people.
 */
export async function listChats(client: Client, meId: string): Promise<ChatSummary[]> {
  const { data: memberships, error: mErr } = await client
    .from("chat_members")
    .select("chat_id, deleted_at")
    .eq("user_id", meId);
  if (mErr) throw mErr;

  const chatIds = (memberships ?? []).map((m) => m.chat_id);
  if (chatIds.length === 0) return [];

  const [{ data: chats }, { data: members }, { data: blocks }] = await Promise.all([
    client.from("chats").select("id, last_message_at").in("id", chatIds),
    client.from("chat_members").select("chat_id, user_id").in("chat_id", chatIds),
    client.from("blocks").select("blocker_id, blocked_id")
  ]);

  const otherIds = (members ?? [])
    .filter((m) => m.user_id !== meId)
    .map((m) => m.user_id);

  const { data: profiles } = otherIds.length
    ? await client.from("profiles").select(PROFILE_COLUMNS).in("id", otherIds)
    : { data: [] as Pick<Profile, "id" | "user_id" | "name" | "avatar_url">[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const otherByChat = new Map<string, string>();
  for (const m of members ?? []) {
    if (m.user_id !== meId) otherByChat.set(m.chat_id, m.user_id);
  }

  // Last message per chat.
  const { data: recent } = await client
    .from("messages")
    .select("id, chat_id, content, type, sender_id, created_at")
    .in("chat_id", chatIds)
    .order("created_at", { ascending: false })
    .limit(400);

  const lastByChat = new Map<string, ChatSummary["lastMessage"]>();
  for (const msg of recent ?? []) {
    if (!lastByChat.has(msg.chat_id)) {
      lastByChat.set(msg.chat_id, {
        content: msg.content,
        type: msg.type,
        sender_id: msg.sender_id,
        created_at: msg.created_at
      });
    }
  }

  const hidden = new Set(
    (memberships ?? []).filter((m) => m.deleted_at).map((m) => m.chat_id)
  );
  const blockedSet = new Set<string>();
  for (const b of blocks ?? []) {
    blockedSet.add(b.blocker_id === meId ? b.blocked_id : b.blocker_id);
  }

  const chatMeta = new Map((chats ?? []).map((c) => [c.id, c]));

  const summaries: ChatSummary[] = chatIds
    .filter((id) => !hidden.has(id))
    .map((id) => {
      const otherId = otherByChat.get(id) ?? null;
      const other = otherId ? profileById.get(otherId) ?? null : null;
      return {
        id,
        lastMessageAt:
          chatMeta.get(id)?.last_message_at ?? new Date(0).toISOString(),
        otherUser: other
          ? { id: other.id, user_id: other.user_id, name: other.name, avatar_url: other.avatar_url }
          : null,
        lastMessage: lastByChat.get(id) ?? null,
        unreadCount: 0,
        blocked: otherId ? blockedSet.has(otherId) : false
      };
    })
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));

  return summaries;
}

export async function getMessages(client: Client, chatId: string): Promise<Message[]> {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
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

/** Live inserts across every chat the caller belongs to (drives the chat list). */
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
