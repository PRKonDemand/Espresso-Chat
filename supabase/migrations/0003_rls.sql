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
