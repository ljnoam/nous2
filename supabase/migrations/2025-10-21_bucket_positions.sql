-- Bucket list positions for reorderable list (idempotent)
-- Date: 2025-10-21

alter table if exists public.bucket_items
  add column if not exists position integer not null default 0;

create index if not exists idx_bucket_position
  on public.bucket_items(couple_id, position);

-- Backfill once per couple: only if all positions are zero
with per_couple as (
  select couple_id, bool_and(position = 0) as all_zero
  from public.bucket_items
  group by couple_id
)
update public.bucket_items bi
set position = src.rn
from (
  select id, couple_id,
         row_number() over (partition by couple_id order by created_at asc) - 1 as rn
  from public.bucket_items
) src
join per_couple pc on pc.couple_id = src.couple_id
where bi.id = src.id
  and pc.all_zero = true;

