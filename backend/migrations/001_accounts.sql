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
