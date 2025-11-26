-- Notes and reactions RLS + realtime (idempotent)
-- Date: 2025-10-23

-- Ensure RLS is enabled where needed
alter table if exists public.love_notes enable row level security;
alter table if exists public.note_reactions enable row level security;

-- love_notes: allow SELECT for couple members
drop policy if exists "notes: select by couple member" on public.love_notes;
create policy "notes: select by couple member" on public.love_notes
for select to public
using (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
);

-- love_notes: allow INSERT for couple members (payload must carry couple_id)
drop policy if exists "notes: insert by couple member" on public.love_notes;
create policy "notes: insert by couple member" on public.love_notes
for insert to public
with check (
  exists (
    select 1 from public.couple_members cm
    where cm.couple_id = love_notes.couple_id
      and cm.user_id = auth.uid()
  )
);

-- love_notes: allow DELETE by author
drop policy if exists "notes: delete by author" on public.love_notes;
create policy "notes: delete by author" on public.love_notes
for delete to public
using (author_id = auth.uid());

-- note_reactions policies only if table exists
do $$ begin
  if to_regclass('public.note_reactions') is not null then
    -- SELECT: couple members can see reactions for their couple's notes
    drop policy if exists "reactions: select by couple member" on public.note_reactions;
    create policy "reactions: select by couple member" on public.note_reactions
    for select to public
    using (
      exists (
        select 1
        from public.love_notes n
        join public.couple_members cm on cm.couple_id = n.couple_id
        where n.id = note_reactions.note_id
          and cm.user_id = auth.uid()
      )
    );

    -- INSERT: only couple members may react (assumes user_id defaults to auth.uid())
    drop policy if exists "reactions: insert by couple member" on public.note_reactions;
    create policy "reactions: insert by couple member" on public.note_reactions
    for insert to public
    with check (
      exists (
        select 1
        from public.love_notes n
        join public.couple_members cm on cm.couple_id = n.couple_id
        where n.id = note_reactions.note_id
          and cm.user_id = auth.uid()
      )
    );

    -- UPDATE/DELETE: only the owner of the reaction may modify/remove it
    drop policy if exists "reactions: update self" on public.note_reactions;
    create policy "reactions: update self" on public.note_reactions
    for update to public
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

    drop policy if exists "reactions: delete self" on public.note_reactions;
    create policy "reactions: delete self" on public.note_reactions
    for delete to public
    using (user_id = auth.uid());
  end if;
end $$;

-- Realtime: ensure note_reactions is published
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if exists (select 1 from pg_tables where schemaname='public' and tablename='note_reactions') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'note_reactions'
    ) then
      alter publication supabase_realtime add table public.note_reactions;
    end if;
  end if;
end$$;

