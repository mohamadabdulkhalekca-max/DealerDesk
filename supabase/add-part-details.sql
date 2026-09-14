-- Dealer Desk — category-specific part details
-- Run this once in the Supabase SQL Editor.
--
-- part_type/compatible_vehicle apply to category='part' (e.g. bumper,
-- headlight — and which vehicle it fits). grade applies to category='oil'
-- (e.g. 5W-30). size applies to category='tire' (e.g. 205/55R16). All
-- nullable/optional — safe to leave blank for categories they don't apply to.

alter table public.parts add column if not exists part_type text;
alter table public.parts add column if not exists compatible_vehicle text;
alter table public.parts add column if not exists grade text;
alter table public.parts add column if not exists size text;
