-- ============================================================================
-- Espresso — 0001 Schema
-- Core tables for profiles, recovery codes, chats, members, messages, blocks.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: public identity. No secrets here (email lives in auth.users).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  user_id     text not null unique,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_user_id_format check (user_id ~ '^[a-zA-Z0-9_]{3,24}$')
);

-- ---------------------------------------------------------------------------
-- recovery_codes: numeric account-recovery code, stored ONLY as a bcrypt hash.
-- Never exposed through normal profile queries.
-- ---------------------------------------------------------------------------
create table if not exists public.recovery_codes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  code_hash   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chats: a conversation container (1:1 today, group-ready by design).
-- ---------------------------------------------------------------------------
create table if not exists public.chats (
  id               uuid primary key default gen_random_uuid(),
  is_group         boolean not null default false,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- chat_members: membership + per-user visibility (deleted_at hides a chat
-- from one participant without destroying the other's history).
-- ---------------------------------------------------------------------------
create table if not exists public.chat_members (
  chat_id     uuid not null references public.chats(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id                    uuid primary key default gen_random_uuid(),
  chat_id               uuid not null references public.chats(id) on delete cascade,
  sender_id             uuid not null references auth.users(id) on delete cascade,
  type                  text not null default 'text'
                          check (type in ('text','image','location')),
  content               text,
  storage_path          text,
  image_width           integer,
  image_height          integer,
  latitude              double precision,
  longitude             double precision,
  location_label        text,
  reply_to_message_id   uuid references public.messages(id) on delete set null,
  status                text not null default 'sent'
                          check (status in ('sent','delivered','read')),
  created_at            timestamptz not null default now(),
  constraint messages_payload_present check (
    (type = 'text'     and content is not null and length(btrim(content)) > 0) or
    (type = 'image'    and storage_path is not null) or
    (type = 'location' and latitude is not null and longitude is not null)
  ),
  constraint messages_lat_range check (latitude  is null or latitude  between -90  and 90),
  constraint messages_lng_range check (longitude is null or longitude between -180 and 180)
);

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- Indexes for the common query patterns named in the spec.
-- ---------------------------------------------------------------------------
create index if not exists idx_messages_chat_created   on public.messages (chat_id, created_at desc);
create index if not exists idx_messages_sender         on public.messages (sender_id);
create index if not exists idx_messages_reply_to       on public.messages (reply_to_message_id);
create index if not exists idx_chat_members_user       on public.chat_members (user_id);
create index if not exists idx_profiles_user_id        on public.profiles (user_id);
create index if not exists idx_blocks_blocked          on public.blocks (blocked_id);
create index if not exists idx_chats_last_message      on public.chats (last_message_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_chats_touch on public.chats;
create trigger trg_chats_touch before update on public.chats
  for each row execute function public.touch_updated_at();
