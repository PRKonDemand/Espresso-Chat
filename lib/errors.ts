/**
 * Map raw server/database errors to messages a normal person can understand.
 * The spec forbids surfacing raw DB/server errors in the UI.
 */
const KNOWN: Record<string, string> = {
  USER_ID_TAKEN: "That User ID is already taken. Try another one.",
  USER_NOT_FOUND: "No user found with that User ID.",
  CANNOT_CHAT_SELF: "You can't start a chat with yourself.",
  BLOCKED: "This conversation is unavailable because one of you has blocked the other.",
  "Invalid login credentials": "Incorrect email or password.",
  "Email not confirmed": "Please confirm your email before signing in.",
  "User already registered": "An account with that email already exists."
};

export function friendlyError(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  const raw =
    typeof err === "string"
      ? err
      : (err as { message?: string }).message ?? String(err);

  for (const key of Object.keys(KNOWN)) {
    if (raw.includes(key)) return KNOWN[key];
  }
  if (/fetch|network/i.test(raw)) {
    return "Network problem. Check your connection and try again.";
  }
  if (/duplicate key|23505/.test(raw)) {
    return "That value is already in use.";
  }
  return "Something went wrong. Please try again.";
}
