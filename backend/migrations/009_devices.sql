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
