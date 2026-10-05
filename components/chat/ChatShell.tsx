"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/authentication/components/AuthProvider";
import { useChats } from "@/features/messaging/hooks/useChats";
import { hideChat } from "@/features/messaging/services/chatService";
import { UserSearch } from "@/features/user-search/components/UserSearch";
import { ChatList } from "./ChatList";
import { Conversation } from "./Conversation";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { RecoveryCodeModal } from "@/components/settings/RecoveryCodeModal";

export function ChatShell() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { chats, loading: chatsLoading, reload } = useChats(user?.id ?? null);

  const selectedId = params.get("c");
  const [showSettings, setShowSettings] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  // First-run: nudge the user to generate a recovery code once.
  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("has_recovery_code")
      .then(({ data }) => setNeedsRecovery(data === false));
  }, [user, supabase]);

  const select = (chatId: string | null) => {
    const url = chatId ? `/chat?c=${chatId}` : "/chat";
    router.replace(url, { scroll: false });
  };

  const onDeleted = async () => {
    if (!selectedId || !user) return;
    try {
      await hideChat(supabase, selectedId, user.id);
    } catch {
      /* ignore — reload reflects the truth either way */
    }
    select(null);
    reload();
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted">
        Loading Espresso…
      </div>
    );
  }

  return (
    <div className="espresso-shell grid h-dvh">
      {/* Sidebar: brand, search, chats */}
      <aside className="flex min-h-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <EspressoMark />
            <span className="text-[17px] font-semibold tracking-tight">Espresso</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Open settings"
            className="rounded-full p-1.5 text-muted hover:bg-bubble"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H7a1.7 1.7 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 2.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V7a1.7 1.7 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>

        <UserSearch meId={user.id} onStarted={(id) => { select(id); reload(); }} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatList
            chats={chats}
            loading={chatsLoading}
            activeId={selectedId}
            meId={user.id}
            onSelect={select}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-3">
          <Avatar name={profile?.name ?? "Me"} src={profile?.avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.name ?? "You"}</p>
            <p className="truncate text-xs text-muted">@{profile?.user_id ?? "…"}</p>
          </div>
        </div>
      </aside>

      {/* Conversation pane */}
      <main className="min-h-0">
        {selectedId ? (
          <Conversation
            key={selectedId}
            chatId={selectedId}
            meId={user.id}
            onBack={() => select(null)}
            onDeleted={onDeleted}
          />
        ) : (
          <div className="hidden h-full md:block">
            <EmptyState
              title="Select a conversation"
              description="Or search for someone by their User ID to start a new chat."
            />
          </div>
        )}
      </main>

      {showSettings && profile && (
        <SettingsPanel
          profile={profile}
          onClose={() => setShowSettings(false)}
          onProfileUpdated={() => {
            refreshProfile();
            setShowSettings(false);
          }}
        />
      )}

      <RecoveryCodeModal
        open={needsRecovery}
        autoGenerate
        onClose={() => setNeedsRecovery(false)}
      />
    </div>
  );
}

function EspressoMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
        <path d="M7 3c0 1-1 1.5-1 2.5S7 7 7 8" />
        <path d="M11 3c0 1-1 1.5-1 2.5S11 7 11 8" />
      </svg>
    </span>
  );
}
