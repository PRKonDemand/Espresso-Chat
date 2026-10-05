"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";
import type { OptimisticMessage } from "@/types/app";
import { ReplyPreview } from "./ReplyPreview";

type Row = Message | OptimisticMessage;

export function MessageComposer({
  onSendText,
  onSendImage,
  onSendLocation,
  replyTo,
  onCancelReply,
  onTyping,
  onStopTyping,
  disabled,
  disabledReason
}: {
  onSendText: (content: string) => void;
  onSendImage: (file: File) => void;
  onSendLocation: () => void;
  replyTo: Row | null;
  onCancelReply: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [value, setValue] = useState("");
  const [locating, setLocating] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (replyTo) areaRef.current?.focus();
  }, [replyTo]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSendText(text);
    setValue("");
    onStopTyping();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  if (disabled) {
    return (
      <div className="border-t border-line bg-surface px-4 py-3 text-center text-sm text-muted">
        {disabledReason ?? "You can't send messages in this conversation."}
      </div>
    );
  }

  return (
    <div className="border-t border-line bg-surface px-3 pb-3 pt-2 md:px-4">
      {replyTo && <ReplyPreview message={replyTo} onCancel={onCancelReply} />}

      <div className="flex items-end gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSendImage(file);
            e.target.value = "";
          }}
        />

        <IconButton label="Attach image" onClick={() => fileRef.current?.click()}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </IconButton>

        <IconButton
          label="Share location"
          loading={locating}
          onClick={async () => {
            setLocating(true);
            try {
              await onSendLocation();
            } finally {
              setLocating(false);
            }
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </IconButton>

        <textarea
          ref={areaRef}
          value={value}
          rows={1}
          placeholder="Message"
          onChange={(e) => {
            setValue(e.target.value);
            if (e.target.value) onTyping();
            else onStopTyping();
          }}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-line bg-bg px-3.5 py-2.5 text-[15px] placeholder:text-muted/70 focus:border-accent/50 focus:outline-none"
        />

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          aria-label="Send message"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            "bg-accent text-accent-ink transition-all duration-150 ease-calm",
            "disabled:cursor-not-allowed disabled:bg-bubble disabled:text-muted active:scale-95"
          )}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  loading
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-muted",
        "hover:bg-bubble hover:text-ink active:scale-95 transition-all duration-150",
        loading && "opacity-50"
      )}
    >
      {children}
    </button>
  );
}
