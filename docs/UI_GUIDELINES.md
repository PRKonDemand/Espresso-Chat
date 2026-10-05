# UI guidelines

## Identity
Espresso should feel **fast, calm, premium and friendly** — an intentionally
designed consumer product, not a generated admin dashboard.

## Theming
The whole look is driven by CSS variables in `styles/theme.css` and surfaced to
Tailwind in `tailwind.config.ts`. Changing the visual identity should mean
editing those files, not hunting through components.

Tokens: background/surface/elevated/line/ink/muted, `accent` (espresso),
`bubble` / `bubble-out`, `danger`, plus radius, motion and bubble-width tokens.

## Layout
- Mobile: one pane at a time — chat list, then conversation.
- Tablet/desktop: chat list + conversation side by side.
- Large desktop: wider chat list. A third panel only if it earns its place.

## Motion
Short and purposeful (140–200ms, `ease-calm`). Motion never delays sending.
Respects `prefers-reduced-motion`.

## Components
`components/ui` holds primitives (Button, Input, Modal, Avatar, Spinner,
EmptyState). Feature UI lives with its feature. No single mega-component.

## Accessibility
Keyboard navigation, visible focus rings, semantic controls, labelled inputs,
`aria-live` for typing/status, sufficient contrast, accessible form errors,
clear loading/empty/error states — built in, not bolted on.

## Avoid
Excessive gradients, random glassmorphism, glow effects, oversized headings,
dashboard templates, noisy layouts, animation for its own sake.
