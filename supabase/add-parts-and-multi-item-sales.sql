-- Car Trader Manager — add parts/oils/tires inventory + multi-item sales
-- Run this once in the Supabase SQL Editor.
--
-- Safe to re-run. Does NOT drop or modify existing columns on `sales`
-- (car_id, sale_price stay in place, just unused going forward) — that
-- keeps this migration non-destructive for any real data already in the
-- table. A sale's items now live in `sale_items`; existing sales are
-- backfilled into that table so nothing is lost.

-- --- Parts (auto parts, oils, tires — quantity-based, unlike unique cars) ---

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'part' check (category in ('oil', 'tire', 'part', 'other')),
  sku text,
  quantity integer not null default 0,
  cost_price numeric not null default 0,
  asking_price numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists parts_user_id_idx on public.parts (user_id);

alter table public.parts enable row level security;

drop policy if exists "Users manage their own parts" on public.parts;
create policy "Users manage their own parts" on public.parts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- Sale line items (a sale can include one or more cars and/or parts) ---

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('car', 'part')),
  car_id uuid references public.cars (id) on delete restrict,
  part_id uuid references public.parts (id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric not null,
  created_at timestamptz not null default now(),
  constraint sale_items_item_shape check (
    (item_type = 'car' and car_id is not null and part_id is null and quantity = 1)
    or
    (item_type = 'part' and part_id is not null and car_id is null and quantity >= 1)
  )
);

create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_car_id_idx on public.sale_items (car_id);
create index if not exists sale_items_part_id_idx on public.sale_items (part_id);

alter table public.sale_items enable row level security;

drop policy if exists "Users manage their own sale items" on public.sale_items;
create policy "Users manage their own sale items" on public.sale_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A sale's price/car now lives in sale_items, not on the sales row itself
-- (a sale can have zero or more of each). Relax the old NOT NULL
-- constraints on the now-unused columns — this only loosens a constraint,
-- it doesn't touch existing data, so it's safe to run even with real rows
-- already present.
alter table public.sales alter column car_id drop not null;
alter table public.sales alter column sale_price drop not null;

-- Backfill: every existing single-car sale becomes a one-line-item sale,
-- skipped on re-run (won't duplicate) since it only inserts for sales that
-- don't already have a sale_items row.
insert into public.sale_items (sale_id, user_id, item_type, car_id, quantity, unit_price)
select s.id, s.user_id, 'car', s.car_id, 1, s.sale_price
from public.sales s
where s.car_id is not null
  and not exists (select 1 from public.sale_items si where si.sale_id = s.id);
