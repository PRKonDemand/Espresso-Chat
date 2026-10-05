# Testing checklist

Mapped to the specification (§31). A feature is "done" only when its stages are
complete (spec §37) — appearing on screen is not enough.

## Authentication
- [ ] Signup with a fresh User ID succeeds and creates a profile.
- [ ] Signup with a taken User ID is rejected with a friendly message.
- [ ] Login with correct / incorrect credentials.
- [ ] Logout returns to `/login`.
- [ ] Password recovery via email link sets a new password.
- [ ] Account recovery via User ID + recovery code sets a new password.
- [ ] A wrong recovery code is rejected.

## Messaging
- [ ] Send and receive text in real time in two browser sessions.
- [ ] Optimistic bubble appears immediately; reconciles on confirmation.
- [ ] Failed send shows a failed state (e.g. go offline mid-send).
- [ ] Reconnect restores the Realtime subscription.
- [ ] Message timestamps and day separators render correctly.

## Typing
- [ ] Indicator appears while the other person types.
- [ ] It disappears after typing stops, on send, and on leaving.
- [ ] No database rows are created per keystroke.

## Reply
- [ ] Swipe on touch arms a reply.
- [ ] Desktop reply action / long-press menu works.
- [ ] Reply preview shows above the composer.
- [ ] The referenced message renders inside the sent bubble.

## Images
- [ ] Client compression runs before upload.
- [ ] Upload succeeds and the image renders on mobile and desktop.
- [ ] Failed upload surfaces an error, not a crash.
- [ ] Images load via short-lived signed URLs.

## Location
- [ ] Permission granted → location card renders and opens Maps.
- [ ] Permission denied → a clear, non-crashing notice.

## Blocking
- [ ] Blocking hides the composer and marks the chat.
- [ ] A blocked user cannot send (server trigger + RLS reject it).
- [ ] Unblock restores messaging.

## Responsive UI
- [ ] Mobile: one pane at a time; conversation slides in/out.
- [ ] Tablet/desktop: side-by-side layout.
- [ ] Large screens: chat list widens gracefully.
- [ ] Keyboard navigation and focus states throughout.
