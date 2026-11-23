-- =====================================================================
-- 007: 2FA'ni "push orqali nollash" uchun yordamchi (GitHub Action chaqiradi).
-- Faqat service_role (maxfiy kalit) ishga tushira oladi: ilovadan ham, anon/authenticated'dan ham EMAS.
-- =====================================================================
create or replace function public.admin_revoke_sessions(p_user uuid) returns void
  language plpgsql security definer set search_path = public, auth, pg_catalog
as $$
begin
  delete from auth.sessions where user_id = p_user;  -- refresh token'lar ham o'chadi
end $$;
revoke all on function public.admin_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_sessions(uuid) to service_role;
