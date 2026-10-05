"use client";

import { cn } from "@/lib/utils";
import { useSwipeToReply } from "../hooks/useSwipe";

/** Wraps a message row so a horizontal swipe arms a reply. */
export function SwipeableRow({
  onReply,
  children,
  className
}: {
  onReply: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { offset, armed, handlers } = useSwipeToReply(onReply);

  return (
    <div className={cn("espresso-swipe-row relative", className)} {...handlers}>
      {offset > 0 && (
        <span
          aria-hidden
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 text-muted transition-opacity",
            armed ? "opacity-100" : "opacity-50"
          )}
          style={{ transform: `translateY(-50%) translateX(${Math.min(offset, 24)}px)` }}
        >
          <ReplyGlyph />
        </span>
      )}
      <div style={{ transform: `translateX(${offset}px)` }} className="transition-transform duration-100 ease-calm">
        {children}
      </div>
    </div>
  );
}

function ReplyGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}
