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
