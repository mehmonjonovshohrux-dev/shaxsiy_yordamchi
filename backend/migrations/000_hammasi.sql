-- =====================================================================
-- 000: HAMMASI BIR JOYDA. Supabase -> SQL Editor -> New query -> hammasini yopishtirib Run.
-- Qayta-qayta ishga tushirsa bo'ladi (idempotent). Tarkibi: 001, 002, 004, 006, 008, 009, 007, 003 (tartib bilan).
-- DIQQAT: oxirgi qism (003) 2 bosqichli tasdiqlashni SERVERDA majburiy qiladi: kod (aal2) bo'lmasa ma'lumot ko'rinmaydi.
-- =====================================================================

-- ################ 001_accounts.sql ################
-- =====================================================================
-- 001: akkauntlar jadvali + qatorli himoya (RLS)
-- Qayta-qayta ishga tushirsa bo'ladi (idempotent). Eski bazani buzmaydi.
-- Supabase -> SQL Editor -> New query -> yopishtirib Run.
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
  images       text[] not null default '{}',
  created_at   timestamptz not null default now(),
  sold_at      date,
  check (status = 'active' or (sold_price is not null and sold_at is not null))
);

-- Yangi maydonlar (eski bazada ham xavfsiz qo'shiladi)
alter table public.accounts add column if not exists buyer      text        not null default '';
alter table public.accounts add column if not exists updated_at timestamptz not null default now();

alter table public.accounts drop constraint if exists accounts_buyer_len;
alter table public.accounts add  constraint accounts_buyer_len check (char_length(buyer) <= 80);

-- Rasmlar soni chegarasi: 12 tagacha
alter table public.accounts drop constraint if exists accounts_images_check;
alter table public.accounts drop constraint if exists accounts_images_max;
alter table public.accounts add  constraint accounts_images_max check (cardinality(images) <= 12);

create index if not exists accounts_user_idx on public.accounts (user_id, status, kind);

-- updated_at avtomatik yangilanadi
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------- Qatorli himoya: har kim faqat O'ZINIKINI ko'radi ----------------
alter table public.accounts enable row level security;

revoke all on public.accounts from anon;
grant select, insert, update, delete on public.accounts to authenticated;

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

-- ################ 002_storage.sql ################
-- =====================================================================
-- 002: rasmlar uchun YOPIQ (private) bucket. Har qanday rasm formati qabul qilinadi.
-- Fayl yo'li: <user_id>/<akkaunt_id>/<fayl>  -> birinchi papka = egasi
-- Idempotent.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('acc-images', 'acc-images', false)
on conflict (id) do nothing;

-- Formatga cheklov yo'q (JPG, PNG, WEBP, HEIC, AVIF...), bitta fayl 25 MB gacha.
update storage.buckets
   set public = false,
       file_size_limit = 26214400,
       allowed_mime_types = null
 where id = 'acc-images';

drop policy if exists "img_select" on storage.objects;
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_delete" on storage.objects;

create policy "img_select" on storage.objects for select to authenticated
  using (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "img_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "img_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'acc-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ################ 004_account_secrets.sql ################
-- Akkauntning kirish ma'lumotlari (login, parol, qo'shimcha). Idempotent: qayta ishga tushirsa bo'ladi.
-- Alohida jadval: ro'yxat so'rovlarida (select * from accounts) bu ma'lumot hech qachon kelmaydi.
create table if not exists public.account_secrets (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  login      text not null default '',
  password   text not null default '',
  extra      text not null default '',
  updated_at timestamptz not null default now(),
  constraint secrets_len check (char_length(login) <= 300 and char_length(password) <= 300 and char_length(extra) <= 2000)
);

alter table public.account_secrets enable row level security;
revoke all on public.account_secrets from anon;
grant select, insert, update, delete on public.account_secrets to authenticated;

drop trigger if exists secrets_updated on public.account_secrets;
create trigger secrets_updated before update on public.account_secrets
  for each row execute function public.set_updated_at();

drop policy if exists sec_select on public.account_secrets;
drop policy if exists sec_insert on public.account_secrets;
drop policy if exists sec_update on public.account_secrets;
drop policy if exists sec_delete on public.account_secrets;
create policy sec_select on public.account_secrets for select to authenticated using (user_id = auth.uid());
-- qo'shishda akkaunt ham shu foydalanuvchiniki bo'lishi shart
create policy sec_insert on public.account_secrets for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy sec_update on public.account_secrets for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sec_delete on public.account_secrets for delete to authenticated using (user_id = auth.uid());

-- ################ 006_installments.sql ################
-- =====================================================================
-- 006: muddatli to'lov (bo'lib to'lash). Idempotent.
-- =====================================================================
alter table public.accounts add column if not exists inst_on    boolean not null default false;
alter table public.accounts add column if not exists inst_start date;
alter table public.accounts add column if not exists inst_end   date;
alter table public.accounts add column if not exists inst_parts int  not null default 1;

alter table public.accounts drop constraint if exists accounts_inst_parts;
alter table public.accounts add  constraint accounts_inst_parts check (inst_parts between 1 and 120);
alter table public.accounts drop constraint if exists accounts_inst_dates;
alter table public.accounts add  constraint accounts_inst_dates check (inst_end is null or inst_start is null or inst_end >= inst_start);

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount     bigint not null check (amount > 0 and amount < 100000000000),
  paid_at    date not null default current_date,
  note       text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists payments_acc_idx on public.payments (account_id, paid_at);

alter table public.payments enable row level security;
revoke all on public.payments from anon;
grant select, insert, update, delete on public.payments to authenticated;

drop policy if exists pay_select on public.payments;
drop policy if exists pay_insert on public.payments;
drop policy if exists pay_update on public.payments;
drop policy if exists pay_delete on public.payments;
create policy pay_select on public.payments for select to authenticated using (user_id = auth.uid());
create policy pay_insert on public.payments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()));
create policy pay_update on public.payments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pay_delete on public.payments for delete to authenticated using (user_id = auth.uid());

-- 2FA majburiy bo'lsa (003), to'lovlarga ham tegishli
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'require_mfa') then
    execute 'drop policy if exists "require_mfa_payments" on public.payments';
    execute 'create policy "require_mfa_payments" on public.payments as restrictive to authenticated using ((select auth.jwt() ->> ''aal'') = ''aal2'')';
  end if;
end $$;

-- ################ 008_installment_weekly.sql ################
-- 008: haftalik muddatli to'lov (har hafta belgilangan summa qo'shilib boradi). Idempotent.
alter table public.accounts add column if not exists inst_weekly bigint not null default 0;
alter table public.accounts drop constraint if exists accounts_inst_weekly;
alter table public.accounts add  constraint accounts_inst_weekly check (inst_weekly >= 0 and inst_weekly < 100000000000);

-- ################ 009_devices.sql ################
-- =====================================================================
-- 009: ulangan qurilmalar ro'yxati (+ avtomatik GPS joylashuv). Idempotent.
-- Har bir qurilma ilovani ochganda o'zining qatorini yangilaydi. Qatorlar faqat egasiga ko'rinadi (RLS).
-- =====================================================================
create table if not exists public.devices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id  text not null check (char_length(device_id) between 8 and 64),
  name       text not null default '' check (char_length(name) <= 80),
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  lat        double precision check (lat between -90 and 90),
  lng        double precision check (lng between -180 and 180),
  accuracy   real,
  loc_at     timestamptz,
  revoked    boolean not null default false,
  unique (user_id, device_id)
);

alter table public.devices enable row level security;
revoke all on public.devices from anon;
grant select, insert, update, delete on public.devices to authenticated;

drop policy if exists dev_select on public.devices;
drop policy if exists dev_insert on public.devices;
drop policy if exists dev_update on public.devices;
drop policy if exists dev_delete on public.devices;
create policy dev_select on public.devices for select to authenticated using (user_id = auth.uid());
create policy dev_insert on public.devices for insert to authenticated with check (user_id = auth.uid());
create policy dev_update on public.devices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy dev_delete on public.devices for delete to authenticated using (user_id = auth.uid());

-- 2FA majburiy bo'lsa (003), qurilmalarga ham tegishli
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'require_mfa') then
    execute 'drop policy if exists "require_mfa_devices" on public.devices';
    execute 'create policy "require_mfa_devices" on public.devices as restrictive to authenticated using ((select auth.jwt() ->> ''aal'') = ''aal2'')';
  end if;
end $$;

-- ################ 007_reset_support.sql ################
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

-- ################ 003_require_mfa.sql ################
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
--                   drop policy "require_mfa_devices" on public.devices;
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

-- 009 ishga tushirilgan bo'lsa (ulangan qurilmalar)
do $$ begin
  if to_regclass('public.devices') is not null then
    execute 'drop policy if exists "require_mfa_devices" on public.devices';
    execute 'create policy "require_mfa_devices" on public.devices as restrictive to authenticated using ((select auth.jwt() ->> ''aal'') = ''aal2'')';
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

