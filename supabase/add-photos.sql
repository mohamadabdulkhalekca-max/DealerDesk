-- Car Trader Manager — add car photo support
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to run even though supabase/schema.sql was already applied.

alter table public.cars add column if not exists photo_url text;

-- Public bucket: photos are served directly via public URL (read access
-- doesn't need auth), but only the signed-in owner can upload/replace/delete
-- their own files, enforced by the policies below.
insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

create policy "Car photos are publicly readable"
on storage.objects for select
using (bucket_id = 'car-photos');

create policy "Users can upload their own car photos"
on storage.objects for insert
with check (bucket_id = 'car-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own car photos"
on storage.objects for update
using (bucket_id = 'car-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own car photos"
on storage.objects for delete
using (bucket_id = 'car-photos' and auth.uid()::text = (storage.foldername(name))[1]);
