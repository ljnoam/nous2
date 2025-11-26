-- Generated from pg_policies on 2025-10-21 07:03:38.05174+00
-- ============================================

-- Enable Row Level Security
alter table public.bucket_items enable row level security;
alter table public.couple_events enable row level security;
alter table public.couple_members enable row level security;
alter table public.couples enable row level security;
alter table public.love_notes enable row level security;
alter table public.note_reactions enable row level security;
alter table public.profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table storage.objects enable row level security;

-- ======================================================
-- ================  BUCKET ITEMS  =======================
-- ======================================================
drop policy if exists "bucket: delete by member" on public.bucket_items;
create policy "bucket: delete by member" on public.bucket_items
for delete to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = bucket_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "bucket: insert by member" on public.bucket_items;
create policy "bucket: insert by member" on public.bucket_items
for insert to public
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = bucket_items.couple_id
      and cm.user_id = auth.uid()
  )
  and author_id = auth.uid()
);

drop policy if exists "bucket: select in couple" on public.bucket_items;
create policy "bucket: select in couple" on public.bucket_items
for select to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = bucket_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "bucket: update by member" on public.bucket_items;
create policy "bucket: update by member" on public.bucket_items
for update to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = bucket_items.couple_id
      and cm.user_id = auth.uid()
  )
);

-- ======================================================
-- ================  COUPLE EVENTS  ======================
-- ======================================================
drop policy if exists "events: delete by member" on public.couple_events;
create policy "events: delete by member" on public.couple_events
for delete to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_events.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "events: insert by member" on public.couple_events;
create policy "events: insert by member" on public.couple_events
for insert to public
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_events.couple_id
      and cm.user_id = auth.uid()
  )
  and author_id = auth.uid()
);

drop policy if exists "events: select in couple" on public.couple_events;
create policy "events: select in couple" on public.couple_events
for select to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_events.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "events: update by member" on public.couple_events;
create policy "events: update by member" on public.couple_events
for update to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_events.couple_id
      and cm.user_id = auth.uid()
  )
);

-- ======================================================
-- ================  COUPLE MEMBERS  =====================
-- ======================================================
drop policy if exists "members: read own membership" on public.couple_members;
create policy "members: read own membership" on public.couple_members
for select to public
using (user_id = auth.uid());

-- ======================================================
-- ================  COUPLES  ============================
-- ======================================================
drop policy if exists "couples: read if member" on public.couples;
create policy "couples: read if member" on public.couples
for select to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couples.id
      and cm.user_id = auth.uid()
  )
);

-- ======================================================
-- ================  LOVE NOTES  =========================
-- ======================================================
drop policy if exists "notes: delete by couple member" on public.love_notes;
create policy "notes: delete by couple member" on public.love_notes
for delete to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "notes: insert by couple member" on public.love_notes;
create policy "notes: insert by couple member" on public.love_notes
for insert to public
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
  and author_id = auth.uid()
);

drop policy if exists "notes: select if same couple" on public.love_notes;
create policy "notes: select if same couple" on public.love_notes
for select to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "notes: update by couple member" on public.love_notes;
create policy "notes: update by couple member" on public.love_notes
for update to public
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
);

-- ======================================================
-- ================  NOTE REACTIONS  =====================
-- ======================================================
drop policy if exists "reactions: delete own in couple" on public.note_reactions;
create policy "reactions: delete own in couple" on public.note_reactions
for delete to public
using (
  user_id = auth.uid()
  and exists (
    select 1 from love_notes ln
    join couple_members cm on cm.couple_id = ln.couple_id
    where ln.id = note_reactions.note_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "reactions: insert own in couple" on public.note_reactions;
create policy "reactions: insert own in couple" on public.note_reactions
for insert to public
with check (
  user_id = auth.uid()
  and exists (
    select 1 from love_notes ln
    join couple_members cm on cm.couple_id = ln.couple_id
    where ln.id = note_reactions.note_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "reactions: select in couple" on public.note_reactions;
create policy "reactions: select in couple" on public.note_reactions
for select to public
using (
  exists (
    select 1 from love_notes ln
    join couple_members cm on cm.couple_id = ln.couple_id
    where ln.id = note_reactions.note_id
      and cm.user_id = auth.uid()
  )
);

-- ======================================================
-- ================  PROFILES  ===========================
-- ======================================================
drop policy if exists "profiles: read self" on public.profiles;
create policy "profiles: read self" on public.profiles
for select to public
using (id = auth.uid());

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
for select to public
using (id = auth.uid());

drop policy if exists "profiles: select same couple" on public.profiles;
create policy "profiles: select same couple" on public.profiles
for select to public
using (
  exists (
    select 1 from couple_members cm1
    join couple_members cm2 on cm1.couple_id = cm2.couple_id
    where cm1.user_id = auth.uid()
      and cm2.user_id = profiles.id
  )
);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
for update to public
using (id = auth.uid());

drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: update self" on public.profiles
for update to public
using (id = auth.uid());

drop policy if exists "profiles: upsert self" on public.profiles;
create policy "profiles: upsert self" on public.profiles
for insert to public
with check (id = auth.uid());

-- ======================================================
-- ================  PUSH SUBSCRIPTIONS  =================
-- ======================================================
drop policy if exists "push: delete own" on public.push_subscriptions;
create policy "push: delete own" on public.push_subscriptions
for delete to public
using (user_id = auth.uid());

drop policy if exists "push: insert own" on public.push_subscriptions;
create policy "push: insert own" on public.push_subscriptions
for insert to public
with check (user_id = auth.uid());

drop policy if exists "push: select in same couple" on public.push_subscriptions;
create policy "push: select in same couple" on public.push_subscriptions
for select to public
using (
  exists (
    select 1 from couple_members cm1
    join couple_members cm2 on cm1.couple_id = cm2.couple_id
    where cm1.user_id = auth.uid()
      and cm2.user_id = push_subscriptions.user_id
      and cm1.user_id <> cm2.user_id
  )
);

drop policy if exists "push: select own" on public.push_subscriptions;
create policy "push: select own" on public.push_subscriptions
for select to public
using (user_id = auth.uid());

-- ======================================================
-- ================  STORAGE / AVATARS  =================
-- ======================================================
drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
for select to public
using (bucket_id = 'avatars');

drop policy if exists "avatars: user can insert own" on storage.objects;
create policy "avatars: user can insert own" on storage.objects
for insert to public
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars: user delete own" on storage.objects;
create policy "avatars: user delete own" on storage.objects
for delete to public
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars: user update own" on storage.objects;
create policy "avatars: user update own" on storage.objects
for update to public
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
