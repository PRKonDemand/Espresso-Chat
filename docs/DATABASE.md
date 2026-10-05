# Database

Schema, relationships, indexes and the access model. Source of truth is
`supabase/migrations/`.

## Tables

### profiles
Public identity. No secrets live here (email stays in `auth.users`).

| column | type | notes |
| --- | --- | --- |
| id | uuid | PK, references `auth.users(id)`, cascade delete |
| user_id | text | unique public handle, immutable, `^[a-zA-Z0-9_]{3,24}$` |
| name | text | display name |
| avatar_url | text | optional |
| created_at / updated_at | timestamptz | maintained by trigger |

### recovery_codes
The numeric account-recovery code. **Stored only as a bcrypt hash.** Fully
closed to clients — no RLS policies exist, so it is unreachable except through
`SECURITY DEFINER` functions.

### chats
Conversation container. `is_group` is present so group chat is additive later;
`last_message_at` drives chat-list ordering.

### chat_members
Membership plus per-user visibility. `deleted_at` hides a chat from *one*
participant without destroying the other's history.

### messages
| column | notes |
| --- | --- |
| type | `text` \| `image` \| `location` |
| content | text body |
| storage_path | Storage object path for images (never binary data) |
| image_width/height | intrinsic size for layout stability |
| latitude/longitude/location_label | location payload |
| reply_to_message_id | self-reference for replies |
| status | `sent` \| `delivered` \| `read` |

A CHECK constraint guarantees each row carries a payload matching its type.

### blocks
`(blocker_id, blocked_id)` PK, self-block prevented by CHECK.

## Indexes
`messages(chat_id, created_at desc)`, `messages(sender_id)`,
`messages(reply_to_message_id)`, `chat_members(user_id)`,
`profiles(user_id)`, `blocks(blocked_id)`, `chats(last_message_at desc)`.

## Functions
- `handle_new_user()` — provisions `profiles` on signup from user metadata.
- `issue_recovery_code()` — generates + hashes a code, returns plaintext once.
- `verify_recovery_code(user_id, code)` — returns the account uuid or null.
- `start_direct_chat(other_user_id)` — finds or creates a 1:1 chat.
- `is_user_id_available(user_id)` — signup availability check.
- `is_chat_member(chat_id, user)` / `are_blocked(a, b)` — RLS helpers.
- `enforce_no_blocked_send()` — trigger; refuses sends across a block.

## Change protocol
Schema design → migration → indexes → RLS → integration → tests → docs.
Never create a table and "add security later".
