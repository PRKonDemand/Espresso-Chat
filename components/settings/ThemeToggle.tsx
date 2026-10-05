"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";
const KEY = "espresso-theme";

function apply(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "system";
    setTheme(stored);
    apply(stored);
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    localStorage.setItem(KEY, t);
    apply(t);
  };

  return (
    <div className="flex rounded-full bg-bubble p-1 text-sm">
      {(["light", "system", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => choose(t)}
          className={cn(
            "flex-1 rounded-full py-1.5 capitalize transition-colors",
            theme === t ? "bg-surface text-ink shadow-sm" : "text-muted"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
