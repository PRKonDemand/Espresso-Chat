# Supabase setup

Espresso's entire backend (schema, functions, RLS, realtime, storage) lives in
`migrations/`. `setup.sql` is the same thing concatenated for a single paste.

## Option A — Dashboard (fastest)
1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, paste the contents of `setup.sql`, and run it.
3. Open **Project Settings → API** and copy the URL, the `anon` key, and the
   `service_role` key into your `.env.local`.

## Option B — Supabase CLI
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Auth settings to check
- **Authentication → Providers → Email**: enable. For local testing you can turn
  *Confirm email* off so signup logs straight in.
- The recovery-code flow is an **alternative** to email reset and needs no extra
  provider.

## What gets created
- Tables: `profiles`, `recovery_codes`, `chats`, `chat_members`, `messages`, `blocks`
- Functions: signup provisioning, `issue_recovery_code`, `verify_recovery_code`,
  `start_direct_chat`, `is_user_id_available`, block enforcement
- RLS on every exposed table (deny-by-default; `recovery_codes` is fully closed)
- Realtime on `messages` and `chat_members`
- Private storage bucket `chat-media` with membership-scoped policies
