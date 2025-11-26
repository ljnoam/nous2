-- User preferences table + RLS + auth cascade cleanup (idempotent)
-- Date: 2025-10-21

-- 1) Table: public.user_prefs
create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes_enabled boolean not null default true,
  bucket_enabled boolean not null default true,
  events_enabled boolean not null default true,
  do_not_disturb jsonb not null default '{"start":"22:00","end":"07:00"}'
);

-- Enable RLS
alter table if exists public.user_prefs enable row level security;

-- Policies: self SELECT/UPSERT
drop policy if exists "prefs: select self" on public.user_prefs;
create policy "prefs: select self" on public.user_prefs
for select to public
using (user_id = auth.uid());

drop policy if exists "prefs: insert self" on public.user_prefs;
create policy "prefs: insert self" on public.user_prefs
for insert to public
with check (user_id = auth.uid());

drop policy if exists "prefs: update self" on public.user_prefs;
create policy "prefs: update self" on public.user_prefs
for update to public
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 2) Ensure ON DELETE CASCADE for tables referencing auth.users
-- Profiles
alter table if exists public.profiles drop constraint if exists profiles_id_fkey;
alter table if exists public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- Push subscriptions
alter table if exists public.push_subscriptions drop constraint if exists push_subscriptions_user_id_fkey;
alter table if exists public.push_subscriptions
  add constraint push_subscriptions_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- Couple members
alter table if exists public.couple_members drop constraint if exists couple_members_user_id_fkey;
alter table if exists public.couple_members
  add constraint couple_members_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- Love notes authors
alter table if exists public.love_notes drop constraint if exists love_notes_author_id_fkey;
alter table if exists public.love_notes
  add constraint love_notes_author_id_fkey foreign key (author_id) references auth.users(id) on delete cascade;

-- Bucket items authors
alter table if exists public.bucket_items drop constraint if exists bucket_items_author_id_fkey;
alter table if exists public.bucket_items
  add constraint bucket_items_author_id_fkey foreign key (author_id) references auth.users(id) on delete cascade;

-- Couple events authors
alter table if exists public.couple_events drop constraint if exists couple_events_author_id_fkey;
alter table if exists public.couple_events
  add constraint couple_events_author_id_fkey foreign key (author_id) references auth.users(id) on delete cascade;

-- Optional: couples.created_by (creator removed -> keep couple but nullify or cascade?)
-- We choose SET NULL to preserve the couple record
do $$ begin
  if exists (
    select 1 from information_schema.constraint_column_usage ccu
    where ccu.table_schema = 'public' and ccu.table_name = 'couples' and ccu.constraint_name = 'couples_created_by_fkey'
  ) then
    alter table public.couples drop constraint couples_created_by_fkey;
  end if;
exception when undefined_object then null; end $$;
alter table if exists public.couples
  add constraint couples_created_by_fkey foreign key (created_by) references auth.users(id) on delete set null;

-- Allow couple members to update couple fields (e.g., started_at)
drop policy if exists "couples: update by member" on public.couples;
create policy "couples: update by member" on public.couples
for update to public
using (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = couples.id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = couples.id
      and cm.user_id = auth.uid()
  )
);
