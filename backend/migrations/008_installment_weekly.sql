-- 008: haftalik muddatli to'lov (har hafta belgilangan summa qo'shilib boradi). Idempotent.
alter table public.accounts add column if not exists inst_weekly bigint not null default 0;
alter table public.accounts drop constraint if exists accounts_inst_weekly;
alter table public.accounts add  constraint accounts_inst_weekly check (inst_weekly >= 0 and inst_weekly < 100000000000);
