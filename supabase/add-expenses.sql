-- Car Trader Manager — recurring/overhead expense tracking (rent, ads,
-- wages, utilities, etc.) separate from per-car additional_costs.
-- Run this once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null default 'other' check (category in ('rent', 'ads', 'wages', 'utilities', 'other')),
  description text,
  amount numeric not null,
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on public.expenses (user_id);

alter table public.expenses enable row level security;

drop policy if exists "Users manage their own expenses" on public.expenses;
create policy "Users manage their own expenses" on public.expenses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
