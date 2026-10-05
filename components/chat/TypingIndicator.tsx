"use client";

export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-1 py-0.5 text-xs text-muted" aria-live="polite">
      <span className="espresso-typing" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span>{label}…</span>
    </div>
  );
}
