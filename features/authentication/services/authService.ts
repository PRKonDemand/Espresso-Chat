import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface SignUpInput {
  email: string;
  password: string;
  userId: string;
  name: string;
}

/** Create an account. The public User ID and name travel in user metadata. */
export async function signUp(client: Client, input: SignUpInput) {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { user_id: input.userId.trim(), name: input.name.trim() }
    }
  });
  if (error) throw error;
  return data;
}

export async function signIn(client: Client, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut(client: Client) {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function requestEmailReset(client: Client, email: string) {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/recover/update` : undefined;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/** Set a new password for the currently authenticated (or recovery) session. */
export async function updatePassword(client: Client, password: string) {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

/** Issue (or rotate) the numeric recovery code. Plaintext returned once. */
export async function issueRecoveryCode(client: Client): Promise<string> {
  const { data, error } = await client.rpc("issue_recovery_code");
  if (error) throw error;
  return data as string;
}

/** Check a User ID + recovery code pair. Returns the account id, or null. */
export async function verifyRecoveryCode(client: Client, userId: string, code: string) {
  const { data, error } = await client.rpc("verify_recovery_code", {
    p_user_id: userId.trim(),
    p_code: code.trim()
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/**
 * Complete a recovery: the code is re-verified server-side, then the password
 * is reset with the service-role client (never in the browser).
 */
export async function recoverAccount(userId: string, code: string, newPassword: string) {
  const res = await fetch("/api/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code, newPassword })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Recovery failed.");
  return json as { ok: true };
}
