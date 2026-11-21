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
