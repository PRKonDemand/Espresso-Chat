# Performance

Espresso's whole reason to exist is that it feels instant (spec §38). Every
change should be measured against that.

## The fast path
```
Composer -> optimistic bubble -> Postgres -> Realtime event -> other person
```
Nothing sits in front of that path.

## Rules that keep it fast
1. **One round trip per screen where possible.** The chat list is a single RPC
   (`get_chat_summaries`), not a fan-out of six queries.
2. **Realtime updates the UI locally — it does not refetch.** A new message
   patches the chat list in place; it never triggers a reload.
3. **Paginate.** A conversation loads the latest 50 messages and fetches older
   ones only on demand. Never load a whole history up front.
4. **One browser client.** The Supabase client is a singleton; a client per
   component means a new auth client (listeners, refresh loop, locks) each time.
5. **Cache signed URLs.** Private images are signed once and reused until they
   expire, not re-signed on every render.
6. **Render immediately, validate in the background.** Auth reads the persisted
   session locally first, then confirms with the server.
7. **Ephemeral stays ephemeral.** Typing indicators are throttled broadcasts and
   never touch the database (spec §7, §25).

## What to avoid
- Refetching a list because one row changed.
- `select("*")` over an unbounded history.
- Creating a Supabase client inside a component body or hook without memoising.
- Anything that delays the composer.

## Region note
Supabase runs in `ap-southeast-1` (Singapore). Most traffic is browser -> Supabase
directly, so users far from Singapore pay that distance once per request. Keep the
Vercel function region near the users *and* keep server-side work (middleware,
`/api/recover`) minimal, since that path is Vercel -> Supabase.
