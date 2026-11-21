-- =====================================================================
-- AccSavdo: Supabase bazasi. Supabase -> SQL Editor ga yopishtirib "Run" bosing.
-- Har bir foydalanuvchi faqat O'Z yozuvlarini ko'radi (Row Level Security).
-- =====================================================================

create table if not exists public.accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  game         text not null default '' check (char_length(game) <= 60),
  kind         text not null check (kind in ('own','partner')),
  partner_name text not null default '' check (char_length(partner_name) <= 60),
  buy_price    bigint not null default 0 check (buy_price >= 0 and buy_price < 100000000000),
  est_price    bigint not null default 0 check (est_price >= 0 and est_price < 100000000000),
  sold_price   bigint check (sold_price is null or (sold_price >= 0 and sold_price < 100000000000)),
  status       text not null default 'active' check (status in ('active','sold')),
  partner_paid boolean not null default false,
  notes        text not null default '' check (char_length(notes) <= 2000),
  images       text[] not null default '{}' check (cardinality(images) <= 8),
  created_at   timestamptz not null default now(),
  sold_at      date,
  check (status = 'active' or (sold_price is not null and sold_at is not null))
);

create index if not exists accounts_user_idx on public.accounts (user_id, status, kind);

alter table public.accounts enable row level security;

drop policy if exists "acc_select" on public.accounts;
drop policy if exists "acc_insert" on public.accounts;
drop policy if exists "acc_update" on public.accounts;
drop policy if exists "acc_delete" on public.accounts;

create policy "acc_select" on public.accounts for select to authenticated
  using (user_id = auth.uid());
create policy "acc_insert" on public.accounts for insert to authenticated
  with check (user_id = auth.uid());
create policy "acc_update" on public.accounts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "acc_delete" on public.accounts for delete to authenticated
  using (user_id = auth.uid());

-- ---------------- Rasmlar uchun PRIVATE bucket ----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('acc-images', 'acc-images', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "img_select" on storage.objects;
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_delete" on storage.objects;

-- fayl yo'li: <user_id>/<account_id>/<fayl>.jpg  -> birinchi papka = foydalanuvchi id
create policy "img_select" on storage.objects for select to authenticated
  using (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "img_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "img_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- IXTIYORIY (2FA ni MAJBURIY qilish): ilovada 2FA ni yoqib, tekshirib bo'lgach
-- quyidagi qatorlarning izohini oching. Shunda parol o'g'irlansa ham,
-- kod (Google Authenticator) bo'lmasa ma'lumotlarga kirib bo'lmaydi.
--
-- create policy "require_mfa" on public.accounts as restrictive to authenticated
--   using ((select auth.jwt()->>'aal') = 'aal2');
-- ---------------------------------------------------------------------



