-- Car Trader Manager — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).

create extension if not exists pgcrypto;

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  make text not null,
  model text not null,
  year integer not null,
  vin text,
  color text,
  mileage integer,
  purchase_price numeric not null,
  purchase_date date,
  status text not null default 'in_stock' check (status in ('in_stock', 'reserved', 'sold')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete restrict,
  buyer_name text not null,
  buyer_contact text,
  sale_price numeric not null,
  sale_date date,
  payment_status text not null default 'paid' check (payment_status in ('paid', 'pending')),
  notes text,
  created_at timestamptz not null default now()
);

create index cars_user_id_idx on public.cars (user_id);
create index sales_user_id_idx on public.sales (user_id);
create index sales_car_id_idx on public.sales (car_id);

alter table public.cars enable row level security;
alter table public.sales enable row level security;

-- Each signed-in user can only see/modify their own rows.
create policy "Users manage their own cars" on public.cars
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own sales" on public.sales
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
