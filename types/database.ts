// Supabase database types. Regenerate with:
//   supabase gen types typescript --project-id <ref> > types/database.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type MessageType = "text" | "image" | "location";
export type MessageStatus = "sent" | "delivered" | "read";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          avatar_url?: string | null;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      chats: {
        Row: {
          id: string;
          is_group: boolean;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; is_group?: boolean; last_message_at?: string };
        Update: { last_message_at?: string };
        Relationships: [];
      };
      chat_members: {
        Row: {
          chat_id: string;
          user_id: string;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: { chat_id: string; user_id: string; deleted_at?: string | null };
        Update: { deleted_at?: string | null };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          type: MessageType;
          content: string | null;
          storage_path: string | null;
          image_width: number | null;
          image_height: number | null;
          latitude: number | null;
          longitude: number | null;
          location_label: string | null;
          reply_to_message_id: string | null;
          status: MessageStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          type?: MessageType;
          content?: string | null;
          storage_path?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          location_label?: string | null;
          reply_to_message_id?: string | null;
          status?: MessageStatus;
        };
        Update: { status?: MessageStatus };
        Relationships: [];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string; created_at?: string };
        Update: { created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_user_id_available: { Args: { p_user_id: string }; Returns: boolean };
      issue_recovery_code: { Args: Record<PropertyKey, never>; Returns: string };
      verify_recovery_code: {
        Args: { p_user_id: string; p_code: string };
        Returns: string;
      };
      start_direct_chat: { Args: { p_other_user_id: string }; Returns: string };
      has_recovery_code: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_chat_member: { Args: { p_chat: string; p_user: string }; Returns: boolean };
      are_blocked: { Args: { p_a: string; p_b: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Chat = Database["public"]["Tables"]["chats"]["Row"];
export type ChatMember = Database["public"]["Tables"]["chat_members"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Block = Database["public"]["Tables"]["blocks"]["Row"];
