-- =====================================================================
-- 003 (IXTIYORIY, lekin tavsiya etiladi): 2 bosqichli tasdiqlashni MAJBURIY qilish.
--
-- Avval ilovada  Menyu -> Ma'lumotlar va xavfsizlik -> 2 bosqichli tasdiqlash  ni yoqing va ishlashini tekshiring.
-- Shundan keyin shu faylni Run qiling: kod (Authenticator) bo'lmasa, parol o'g'irlansa
-- ham bazadagi ma'lumot va rasmlarga kirib bo'lmaydi.
--
-- Qaytarish uchun:  drop policy "require_mfa" on public.accounts;
--                   drop policy "require_mfa_secrets" on public.account_secrets;
--                   drop policy "require_mfa_files" on storage.objects;
--                   drop policy "require_mfa_payments" on public.payments;
-- =====================================================================

drop policy if exists "require_mfa" on public.accounts;
create policy "require_mfa" on public.accounts
  as restrictive to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

-- 004 ishga tushirilgan bo'lsa (akkaunt kirish ma'lumotlari)
do $$ begin
  if to_regclass('public.account_secrets') is not null then
    execute 'drop policy if exists "require_mfa_secrets" on public.account_secrets';
    execute 'create policy "require_mfa_secrets" on public.account_secrets as restrictive to authenticated using ((select auth.jwt() ->> ''aal'') = ''aal2'')';
  end if;
end $$;

-- 006 ishga tushirilgan bo'lsa (muddatli to'lovlar)
do $$ begin
  if to_regclass('public.payments') is not null then
    execute 'drop policy if exists "require_mfa_payments" on public.payments';
    execute 'create policy "require_mfa_payments" on public.payments as restrictive to authenticated using ((select auth.jwt() ->> ''aal'') = ''aal2'')';
  end if;
end $$;

drop policy if exists "require_mfa_files" on storage.objects;
create policy "require_mfa_files" on storage.objects
  as restrictive to authenticated
  using (bucket_id <> 'acc-images' or (select auth.jwt() ->> 'aal') = 'aal2');

-- Ilova shu funksiya orqali "serverda 2FA majburiy" holatini ko'rsatadi
create or replace function public.mfa_enforced() returns boolean
  language sql stable security definer set search_path = public, pg_catalog
  as $$ select exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'require_mfa'); $$;
revoke all on function public.mfa_enforced() from public, anon;
grant execute on function public.mfa_enforced() to authenticated;
