-- Dealer Desk — add car photo support (multiple photos per car)
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Safe to run even if you already applied an earlier version of this file
-- that added a single `photo_url` column — this script is idempotent, and
-- carries forward any photo already stored in that column (see the
-- backfill below). You can optionally drop the old column afterwards
-- with: alter table public.cars drop column if exists photo_url;

alter table public.cars add column if not exists photo_urls text[] not null default '{}';

-- Backfill: if an earlier single-photo version of this script ran and
-- some cars have `photo_url` set, carry it into the new array column so
-- those photos don't silently disappear from the app.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cars' and column_name = 'photo_url'
  ) then
    update public.cars
    set photo_urls = array[photo_url]
    where photo_url is not null and coalesce(array_length(photo_urls, 1), 0) = 0;
  end if;
end $$;

-- Public bucket: photos are served directly via public URL (read access
-- doesn't need auth), but only the signed-in owner can upload/replace/delete
-- their own files, enforced by the policies below.
insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

drop policy if exists "Car photos are publicly readable" on storage.objects;
create policy "Car photos are publicly readable"
on storage.objects for select
using (bucket_id = 'car-photos');

drop policy if exists "Users can upload their own car photos" on storage.objects;
create policy "Users can upload their own car photos"
on storage.objects for insert
with check (bucket_id = 'car-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own car photos" on storage.objects;
create policy "Users can update their own car photos"
on storage.objects for update
using (bucket_id = 'car-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own car photos" on storage.objects;
create policy "Users can delete their own car photos"
on storage.objects for delete
using (bucket_id = 'car-photos' and auth.uid()::text = (storage.foldername(name))[1]);
