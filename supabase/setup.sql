-- ============================================================================
-- Espresso — one-shot setup. Paste into Supabase Dashboard > SQL Editor.
-- (Equivalent to supabase/migrations/* applied in order.)
-- ============================================================================

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

-- ============================================================================
-- Espresso — 0002 Functions & Triggers
-- Signup provisioning, recovery-code issuance/verification, chat creation,
-- and server-side block enforcement.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- New auth user -> create the public profile using metadata chosen at signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id text;
  v_name    text;
begin
  v_user_id := nullif(new.raw_user_meta_data->>'user_id', '');
  v_name    := nullif(new.raw_user_meta_data->>'name', '');

  if v_user_id is null then
    v_user_id := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if v_name is null then
    v_name := coalesce(split_part(new.email, '@', 1), 'Espresso user');
  end if;

  begin
    insert into public.profiles (id, user_id, name) values (new.id, v_user_id, v_name);
  exception when unique_violation then
    raise exception 'USER_ID_TAKEN' using errcode = '23505';
  end;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Public User ID must be immutable once set.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
as $fn$
begin
  if new.user_id <> old.user_id then
    raise exception 'user_id is immutable';
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_profiles_immutable_user_id on public.profiles;
create trigger trg_profiles_immutable_user_id before update on public.profiles
  for each row execute function public.prevent_user_id_change();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_chat_member(p_chat uuid, p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.chat_members
    where chat_id = p_chat and user_id = p_user
  );
$fn$;

create or replace function public.are_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$fn$;

create or replace function public.is_user_id_available(p_user_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select not exists (select 1 from public.profiles where user_id = p_user_id);
$fn$;

-- ---------------------------------------------------------------------------
-- Issue (or rotate) a numeric recovery code. Plaintext is returned exactly
-- once to the caller; only a bcrypt hash is ever persisted.
-- ---------------------------------------------------------------------------
create or replace function public.issue_recovery_code()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_code := lpad(
    (abs(('x' || encode(gen_random_bytes(8), 'hex'))::bit(64)::bigint) % 1000000000000)::text,
    12, '0'
  );

  insert into public.recovery_codes (user_id, code_hash)
  values (auth.uid(), crypt(v_code, gen_salt('bf')))
  on conflict (user_id) do update
    set code_hash = excluded.code_hash, updated_at = now();

  return v_code;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Verify a recovery code for a given public User ID. Returns the account UUID
-- on success, NULL on failure. Callable while signed out (anon).
-- ---------------------------------------------------------------------------
create or replace function public.verify_recovery_code(p_user_id text, p_code text)
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $fn$
declare
  v_uid uuid;
begin
  select rc.user_id into v_uid
  from public.recovery_codes rc
  join public.profiles p on p.id = rc.user_id
  where p.user_id = p_user_id
    and rc.code_hash = crypt(p_code, rc.code_hash);

  return v_uid;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Start (or reopen) a direct 1:1 chat with another user by their public ID.
-- ---------------------------------------------------------------------------
create or replace function public.start_direct_chat(p_other_user_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_me    uuid := auth.uid();
  v_other uuid;
  v_chat  uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select id into v_other from public.profiles where user_id = p_other_user_id;
  if v_other is null then
    raise exception 'USER_NOT_FOUND';
  end if;
  if v_other = v_me then
    raise exception 'CANNOT_CHAT_SELF';
  end if;
  if public.are_blocked(v_me, v_other) then
    raise exception 'BLOCKED';
  end if;

  select c.id into v_chat
  from public.chats c
  join public.chat_members m1 on m1.chat_id = c.id and m1.user_id = v_me
  join public.chat_members m2 on m2.chat_id = c.id and m2.user_id = v_other
  where c.is_group = false
  limit 1;

  if v_chat is not null then
    update public.chat_members set deleted_at = null
      where chat_id = v_chat and user_id = v_me;
    return v_chat;
  end if;

  insert into public.chats (is_group) values (false) returning id into v_chat;
  insert into public.chat_members (chat_id, user_id)
    values (v_chat, v_me), (v_chat, v_other);

  return v_chat;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Server-side block enforcement on send. UI-only blocking is not sufficient.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_no_blocked_send()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_member uuid;
begin
  for v_member in
    select user_id from public.chat_members
    where chat_id = new.chat_id and user_id <> new.sender_id
  loop
    if public.are_blocked(new.sender_id, v_member) then
      raise exception 'BLOCKED';
    end if;
  end loop;
  return new;
end;
$fn$;

drop trigger if exists trg_messages_block_guard on public.messages;
create trigger trg_messages_block_guard before insert on public.messages
  for each row execute function public.enforce_no_blocked_send();

-- ---------------------------------------------------------------------------
-- On new message: bump the chat and resurface it for everyone.
-- ---------------------------------------------------------------------------
create or replace function public.on_message_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.chats set last_message_at = new.created_at where id = new.chat_id;
  update public.chat_members set deleted_at = null where chat_id = new.chat_id;
  return new;
end;
$fn$;

drop trigger if exists trg_messages_after_insert on public.messages;
create trigger trg_messages_after_insert after insert on public.messages
  for each row execute function public.on_message_created();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.is_user_id_available(text) to anon, authenticated;
grant execute on function public.verify_recovery_code(text, text) to anon, authenticated;
grant execute on function public.issue_recovery_code() to authenticated;
grant execute on function public.start_direct_chat(text) to authenticated;
grant execute on function public.is_chat_member(uuid, uuid) to authenticated;
grant execute on function public.are_blocked(uuid, uuid) to authenticated;

-- ============================================================================
-- Espresso — 0003 Row Level Security
-- Every exposed table gets an intentional authorization model.
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.recovery_codes  enable row level security;
alter table public.chats           enable row level security;
alter table public.chat_members    enable row level security;
alter table public.messages        enable row level security;
alter table public.blocks          enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: a directory of public identity. Writable only by its owner.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- recovery_codes: no policies at all -> no direct access. Reachable only via
-- the SECURITY DEFINER functions issue_recovery_code()/verify_recovery_code().
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- chats / chat_members: members only. Creation happens via SECURITY DEFINER
-- functions, so no INSERT policy is exposed.
-- ---------------------------------------------------------------------------
drop policy if exists chats_select_member on public.chats;
create policy chats_select_member on public.chats
  for select to authenticated using (public.is_chat_member(id, auth.uid()));

drop policy if exists chat_members_select on public.chat_members;
create policy chat_members_select on public.chat_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_chat_member(chat_id, auth.uid()));

drop policy if exists chat_members_update_self on public.chat_members;
create policy chat_members_update_self on public.chat_members
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- messages: readable/writable only by chat members; sender must be the caller.
-- The block guard trigger adds a second, independent server-side check.
-- ---------------------------------------------------------------------------
drop policy if exists messages_select_member on public.messages;
create policy messages_select_member on public.messages
  for select to authenticated using (public.is_chat_member(chat_id, auth.uid()));

drop policy if exists messages_insert_member on public.messages;
create policy messages_insert_member on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id, auth.uid()));

drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
  for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- ---------------------------------------------------------------------------
-- blocks: a user manages only their own block list; both sides can see the
-- relationship so the UI can reflect a blocked state.
-- ---------------------------------------------------------------------------
drop policy if exists blocks_select_involved on public.blocks;
create policy blocks_select_involved on public.blocks
  for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- ============================================================================
-- Espresso — 0004 Realtime
-- Persistent changes (messages, membership) stream over Realtime.
-- Ephemeral signals (typing) use broadcast/presence and are NOT persisted.
-- ============================================================================

alter table public.messages     replica identity full;
alter table public.chat_members replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_members'
  ) then
    alter publication supabase_realtime add table public.chat_members;
  end if;
end $$;

-- ============================================================================
-- Espresso — 0005 Storage
-- Private bucket for chat media. Binaries live in Storage, never in Postgres.
-- Object path convention: {chat_id}/{user_id}/{uuid}.{ext}
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

drop policy if exists chat_media_read on storage.objects;
create policy chat_media_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-media'
    and public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists chat_media_insert on storage.objects;
create policy chat_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[2]::uuid = auth.uid()
    and public.is_chat_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists chat_media_delete_own on storage.objects;
create policy chat_media_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-media' and owner = auth.uid());
