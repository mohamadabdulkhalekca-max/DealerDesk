-- Car Trader Manager — track repair/reconditioning/transport costs per car,
-- plus an optional public asking price for "for sale" flyers.
-- Run this once in the Supabase SQL Editor.

alter table public.cars add column if not exists additional_costs numeric not null default 0;
alter table public.cars add column if not exists asking_price numeric;
