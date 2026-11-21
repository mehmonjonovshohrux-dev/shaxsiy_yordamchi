-- =====================================================================
-- 003 (IXTIYORIY, lekin tavsiya etiladi): 2 bosqichli tasdiqlashni MAJBURIY qilish.
--
-- Avval ilovada  Sozlama -> 2 bosqichli tasdiqlash  ni yoqing va ishlashini tekshiring.
-- Shundan keyin shu faylni Run qiling: kod (Authenticator) bo'lmasa, parol o'g'irlansa
-- ham bazadagi ma'lumot va rasmlarga kirib bo'lmaydi.
--
-- Qaytarish uchun:  drop policy "require_mfa" on public.accounts;
--                   drop policy "require_mfa_files" on storage.objects;
-- =====================================================================

drop policy if exists "require_mfa" on public.accounts;
create policy "require_mfa" on public.accounts
  as restrictive to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists "require_mfa_files" on storage.objects;
create policy "require_mfa_files" on storage.objects
  as restrictive to authenticated
  using (bucket_id <> 'acc-images' or (select auth.jwt() ->> 'aal') = 'aal2');
