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
