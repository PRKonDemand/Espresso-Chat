# Security

## Principles
1. Authorization is enforced **server/database-side**, never only in the UI.
2. The service-role key never reaches the browser.
3. Sensitive credentials are never stored as plaintext.

## Row Level Security
RLS is enabled on every exposed table; there are no permissive "allow all"
policies.

| table | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| profiles | any authenticated | self only | self only | — |
| recovery_codes | — (closed) | — | — | — |
| chats | members | via function | — | — |
| chat_members | self or member | via function | self | — |
| messages | members | self + member | own | — |
| blocks | involved parties | self | — | self |

`recovery_codes` has RLS enabled with **zero policies**, so it is invisible to
clients. It is only touched inside `SECURITY DEFINER` functions.

## Blocking
Enforced in two independent places:
- A `BEFORE INSERT` trigger (`enforce_no_blocked_send`) on `messages`.
- RLS on `messages` restricting inserts to chat members.
A UI check alone is explicitly **not** treated as security.

## Recovery code
- 12-digit numeric, generated with `gen_random_bytes`.
- Stored as `crypt(code, gen_salt('bf'))` (bcrypt via pgcrypto).
- Verified with `crypt(input, stored_hash)`.
- Plaintext is returned exactly once and never persisted.

## Password reset via recovery code
`/api/recover` (server route):
1. Verifies `user_id` + code with the anon client → `verify_recovery_code`.
2. Only on success, sets the password with the service-role client.
The service key is read from `SUPABASE_SERVICE_ROLE_KEY` and is never sent to
the browser (no `NEXT_PUBLIC_` prefix).

## Storage
Bucket `chat-media` is **private**. Read/write policies require the object's
first path segment (a `chat_id`) to be a chat the caller belongs to; only the
uploader may delete. Rendering uses short-lived signed URLs.

## Secrets
- Browser: anon key only.
- Server: `SUPABASE_SERVICE_ROLE_KEY` used solely by `/api/recover`.
- `.env.local` is git-ignored; `.env.example` documents the shape.
