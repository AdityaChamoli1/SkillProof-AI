-- Lock down SECURITY DEFINER helpers
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
-- has_role is used inside RLS policies, must remain callable
alter function public.set_updated_at() set search_path = public;