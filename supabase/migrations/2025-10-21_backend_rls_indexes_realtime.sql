-- RLS, Indexes, and Realtime publication hardening (idempotent)
-- Date: 2025-10-21

-- Ensure RLS is enabled (idempotent)
alter table if exists public.love_notes enable row level security;
alter table if exists public.bucket_items enable row level security;
alter table if exists public.couple_events enable row level security;

-- Missing policy: love_notes UPDATE restricted to couple members and preserving couple scope
drop policy if exists "notes: update by couple member" on public.love_notes;
create policy "notes: update by couple member" on public.love_notes
for update to public
using (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
);

-- Performance indexes
create index if not exists idx_notes_couple on public.love_notes(couple_id, created_at desc);
create index if not exists idx_bucket_couple on public.bucket_items(couple_id, is_done, created_at desc);
create index if not exists idx_events_couple on public.couple_events(couple_id, starts_at);
create index if not exists idx_push_user on public.push_subscriptions(user_id);

-- Realtime: ensure tables are in supabase_realtime publication
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'love_notes'
  ) then
    alter publication supabase_realtime add table public.love_notes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bucket_items'
  ) then
    alter publication supabase_realtime add table public.bucket_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_events'
  ) then
    alter publication supabase_realtime add table public.couple_events;
  end if;
end$$;
