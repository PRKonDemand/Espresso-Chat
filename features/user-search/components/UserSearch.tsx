"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { findUserByUserId, startChat } from "../services/userSearch";
import type { Profile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export function UserSearch({
  meId,
  onStarted
}: {
  meId: string;
  onStarted: (chatId: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = query.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setSearched(false);
    try {
      const found = await findUserByUserId(supabase, id);
      setResult(found);
      if (!found) setError("No user found with that User ID.");
      setSearched(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const chatId = await startChat(supabase, result.user_id);
      onStarted(chatId);
      setQuery("");
      setResult(null);
      setSearched(false);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 pb-2 pt-1">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find by User ID"
          aria-label="Search by User ID"
          className="h-9 flex-1 rounded-full border border-line bg-bg px-3.5 text-sm placeholder:text-muted/70 focus:border-accent/50 focus:outline-none"
        />
        <Button type="submit" size="sm" variant="subtle" loading={busy} className="h-9 px-3">
          Search
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-2 px-1 text-xs text-danger">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
          <Avatar name={result.name} src={result.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{result.name}</p>
            <p className="truncate text-xs text-muted">@{result.user_id}</p>
          </div>
          <Button size="sm" onClick={open} disabled={result.id === meId} loading={busy}>
            {result.id === meId ? "You" : "Chat"}
          </Button>
        </div>
      )}
      {searched && !result && !error && (
        <p className="mt-2 px-1 text-xs text-muted">Nothing found.</p>
      )}
    </div>
  );
}
