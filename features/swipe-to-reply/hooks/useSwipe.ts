"use client";

import { useRef, useState } from "react";

const TRIGGER_PX = 56;
const MAX_PX = 80;

/** Horizontal swipe detection for touch devices (swipe-to-reply). */
export function useSwipeToReply(onReply: () => void) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [armed, setArmed] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll wins
    const clamped = Math.max(0, Math.min(dx, MAX_PX));
    setOffset(clamped);
    setArmed(clamped >= TRIGGER_PX);
  };

  const onTouchEnd = () => {
    if (armed) onReply();
    startX.current = null;
    startY.current = null;
    setOffset(0);
    setArmed(false);
  };

  return { offset, armed, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
