import type { Config } from "tailwindcss";

/**
 * Espresso design system. The visual identity is driven by CSS variables in
 * styles/theme.css, so changing the look means editing a small number of
 * centralized files — not the whole codebase.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--c-accent-ink) / <alpha-value>)",
        bubble: "rgb(var(--c-bubble) / <alpha-value>)",
        "bubble-out": "rgb(var(--c-bubble-out) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)"
      },
      borderRadius: {
        bubble: "1.15rem",
        card: "0.9rem"
      },
      fontFamily: {
        sans: ["var(--font-sans)"]
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.06)",
        pop: "0 12px 40px rgb(0 0 0 / 0.16)"
      },
      keyframes: {
        "bubble-in": {
          "0%": { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        }
      },
      animation: {
        "bubble-in": "bubble-in 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in": "fade-in 160ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
