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
