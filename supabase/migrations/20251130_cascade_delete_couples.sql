-- Ensure cascading deletes for couple-related data and user references
-- Date: 2025-11-30

-- 1. love_notes: cascade on couple_id
alter table if exists public.love_notes drop constraint if exists love_notes_couple_id_fkey;
alter table if exists public.love_notes
  add constraint love_notes_couple_id_fkey foreign key (couple_id) references public.couples(id) on delete cascade;

-- 2. couple_events: cascade on couple_id
alter table if exists public.couple_events drop constraint if exists couple_events_couple_id_fkey;
alter table if exists public.couple_events
  add constraint couple_events_couple_id_fkey foreign key (couple_id) references public.couples(id) on delete cascade;

-- 3. albums: ensure created_by doesn't block user delete (set null)
alter table if exists public.albums drop constraint if exists albums_created_by_fkey;
alter table if exists public.albums
  add constraint albums_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

-- 4. photos: ensure uploaded_by doesn't block user delete (cascade)
alter table if exists public.photos drop constraint if exists photos_uploaded_by_fkey;
alter table if exists public.photos
  add constraint photos_uploaded_by_fkey foreign key (uploaded_by) references auth.users(id) on delete cascade;

-- 5. couple_members: ensure cascade on couple_id
alter table if exists public.couple_members drop constraint if exists couple_members_couple_id_fkey;
alter table if exists public.couple_members
  add constraint couple_members_couple_id_fkey foreign key (couple_id) references public.couples(id) on delete cascade;
