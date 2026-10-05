import { Suspense } from "react";
import { ChatShell } from "@/components/chat/ChatShell";

export const metadata = { title: "Chats · Espresso" };

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center text-sm text-muted">Loading Espresso…</div>}>
      <ChatShell />
    </Suspense>
  );
}
