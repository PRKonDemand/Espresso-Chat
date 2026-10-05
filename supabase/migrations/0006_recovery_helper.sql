-- ============================================================================
-- Espresso — 0006 Recovery helper
-- Lets the app tell whether the signed-in user has generated a recovery code,
-- without exposing the code itself.
-- ============================================================================
create or replace function public.has_recovery_code()
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (select 1 from public.recovery_codes where user_id = auth.uid());
$fn$;

grant execute on function public.has_recovery_code() to authenticated;
