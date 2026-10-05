import type { Message, Profile } from "./database";

/** A chat plus the bits the chat list needs to render a row. */
export interface ChatSummary {
  id: string;
  lastMessageAt: string;
  /** The other participant in a 1:1 chat. */
  otherUser: Pick<Profile, "id" | "user_id" | "name" | "avatar_url"> | null;
  lastMessage: Pick<Message, "content" | "type" | "sender_id" | "created_at"> | null;
  unreadCount: number;
  /** True when the other participant is blocked by, or has blocked, me. */
  blocked: boolean;
}

export interface SendTextPayload {
  type: "text";
  content: string;
}

export interface SendImagePayload {
  type: "image";
  file: File;
}

export interface SendLocationPayload {
  type: "location";
  latitude: number;
  longitude: number;
  label?: string;
}

export type OutgoingMessage = SendTextPayload | SendImagePayload | SendLocationPayload;

/** A message that is being sent optimistically, before the server confirms. */
export interface OptimisticMessage extends Partial<Message> {
  id: string;
  chat_id: string;
  sender_id: string;
  type: Message["type"];
  created_at: string;
  pending?: boolean;
  failed?: boolean;
}
