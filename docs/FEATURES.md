# Features

Status of the currently approved feature set (spec §34).

| Feature | Where | Notes |
| --- | --- | --- |
| Account creation | `components/auth/SignupForm.tsx` | email, name, User ID, password |
| Numeric recovery code | `RecoveryCodeModal.tsx`, migration 0002/0006 | shown once, stored hashed |
| Login / logout | `LoginForm.tsx`, settings | Supabase Auth |
| Password recovery | `RecoveryForm.tsx`, `/api/recover` | code or email link |
| User ID search | `features/user-search` | find + start chat |
| Start / open chat | `start_direct_chat` RPC | finds or creates |
| Real-time text | `features/messaging` | Realtime postgres_changes |
| Live typing indicator | `features/typing-indicator` | ephemeral broadcast, throttled |
| Swipe-to-reply | `features/swipe-to-reply` | touch swipe + desktop action |
| Image messaging | `features/image-sharing` | client compress → Storage → metadata |
| Location sharing | `features/location-sharing` | one-shot, explicit permission |
| Delete / remove chat | `chat_members.deleted_at` | per-user hide only |
| Block user | `features/blocking`, trigger + RLS | server-enforced |
| Settings | `components/settings` | profile, recovery, password, theme |
| Responsive UI | `styles/responsive.css` | one-pane mobile, two-pane desktop |

## Deliberately out of scope
Stories, channels, public groups, voice/video calls, status updates, payments,
public profiles, complex reactions, AI chatbots, ads, social feeds and
gamification all require explicit product approval (spec §33).

## Adding a feature
Define → update ESPRESSO_SPEC.md → feature folder → UI → migration → RLS →
tests → integrate → verify mobile + desktop → document.
