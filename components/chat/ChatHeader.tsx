"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";

export function ChatHeader({
  partner,
  blocked,
  onBack,
  onToggleBlock,
  onDeleteChat
}: {
  partner: Pick<Profile, "name" | "user_id" | "avatar_url"> | null;
  blocked: boolean;
  onBack: () => void;
  onToggleBlock: () => void;
  onDeleteChat: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 md:px-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to chats"
        className="rounded-full p-1.5 text-muted hover:bg-bubble md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <Avatar name={partner?.name ?? "?"} src={partner?.avatar_url} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{partner?.name ?? "Conversation"}</p>
        {partner && <p className="truncate text-xs text-muted">@{partner.user_id}</p>}
      </div>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="Conversation options"
          aria-haspopup="menu"
          aria-expanded={menu}
          className="rounded-full p-1.5 text-muted hover:bg-bubble"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>

        {menu && (
          <div role="menu" className="espresso-panel absolute right-0 z-30 mt-1 w-52 p-1.5">
            <button
              role="menuitem"
              onClick={() => {
                onToggleBlock();
                setMenu(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-bubble"
            >
              {blocked ? "Unblock user" : "Block user"}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                onDeleteChat();
                setMenu(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
            >
              Delete chat
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
