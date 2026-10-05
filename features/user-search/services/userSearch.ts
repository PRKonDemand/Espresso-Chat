import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function isUserIdAvailable(client: Client, userId: string) {
  const { data, error } = await client.rpc("is_user_id_available", { p_user_id: userId });
  if (error) throw error;
  return data as boolean;
}

/** Look up a public profile by its Espresso User ID. */
export async function findUserByUserId(client: Client, userId: string): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, user_id, name, avatar_url, created_at, updated_at")
    .eq("user_id", userId.trim())
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Open (or reopen) a direct chat with a user, returning the chat id. */
export async function startChat(client: Client, otherUserId: string): Promise<string> {
  const { data, error } = await client.rpc("start_direct_chat", {
    p_other_user_id: otherUserId.trim()
  });
  if (error) throw error;
  return data as string;
}
