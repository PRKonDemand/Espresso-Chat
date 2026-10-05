import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function blockUser(client: Client, meId: string, otherId: string) {
  const { error } = await client.from("blocks").insert({ blocker_id: meId, blocked_id: otherId });
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function unblockUser(client: Client, meId: string, otherId: string) {
  const { error } = await client
    .from("blocks")
    .delete()
    .eq("blocker_id", meId)
    .eq("blocked_id", otherId);
  if (error) throw error;
}

export interface BlockStatus {
  /** I have blocked them. */
  iBlocked: boolean;
  /** They have blocked me. */
  theyBlocked: boolean;
}

export async function getBlockStatus(
  client: Client,
  meId: string,
  otherId: string
): Promise<BlockStatus> {
  const { data, error } = await client
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${meId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${meId})`
    );
  if (error) throw error;
  const iBlocked = (data ?? []).some((b) => b.blocker_id === meId);
  const theyBlocked = (data ?? []).some((b) => b.blocker_id === otherId);
  return { iBlocked, theyBlocked };
}
