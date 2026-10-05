-- ============================================================================
-- Espresso — 0007 Chat summaries
-- Returns the caller's whole chat list in ONE round trip: the other
-- participant, the latest message, and block state. Replaces the six-query
-- fan-out the client used to do on every load.
-- ============================================================================
create or replace function public.get_chat_summaries()
returns table (
  chat_id          uuid,
  last_message_at  timestamptz,
  other_id         uuid,
  other_user_id    text,
  other_name       text,
  other_avatar_url text,
  last_content     text,
  last_type        text,
  last_sender_id   uuid,
  last_created_at  timestamptz,
  blocked          boolean
)
language sql
security definer
stable
set search_path = public
as $fn$
  with me as (select auth.uid() as uid),
  my_chats as (
    select cm.chat_id
    from public.chat_members cm
    where cm.user_id = (select uid from me)
      and cm.deleted_at is null
  ),
  others as (
    select distinct on (cm.chat_id) cm.chat_id, cm.user_id as other_id
    from public.chat_members cm
    join my_chats mc on mc.chat_id = cm.chat_id
    where cm.user_id <> (select uid from me)
    order by cm.chat_id
  ),
  last_msg as (
    select distinct on (m.chat_id)
      m.chat_id, m.content, m.type, m.sender_id, m.created_at
    from public.messages m
    join my_chats mc on mc.chat_id = m.chat_id
    order by m.chat_id, m.created_at desc
  )
  select
    c.id,
    c.last_message_at,
    o.other_id,
    p.user_id,
    p.name,
    p.avatar_url,
    lm.content,
    lm.type,
    lm.sender_id,
    lm.created_at,
    exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select uid from me) and b.blocked_id = o.other_id)
         or (b.blocker_id = o.other_id and b.blocked_id = (select uid from me))
    )
  from my_chats mc
  join public.chats c on c.id = mc.chat_id
  left join others o on o.chat_id = c.id
  left join public.profiles p on p.id = o.other_id
  left join last_msg lm on lm.chat_id = c.id
  order by c.last_message_at desc;
$fn$;

grant execute on function public.get_chat_summaries() to authenticated;
