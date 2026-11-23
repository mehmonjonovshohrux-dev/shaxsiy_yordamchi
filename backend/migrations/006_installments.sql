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
