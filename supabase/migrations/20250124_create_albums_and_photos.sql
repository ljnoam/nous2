-- Create albums table
create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade not null,
  title text not null,
  description text,
  is_private boolean default false,
  cover_photo_url text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists albums_couple_id_idx on albums(couple_id);
create index if not exists albums_is_private_idx on albums(is_private);

-- Create photos table
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references albums(id) on delete cascade not null,
  couple_id uuid references couples(id) on delete cascade not null,
  url text not null,
  thumbnail_url text,
  caption text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  location_name text,
  taken_at timestamptz,
  uploaded_by uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create index if not exists photos_album_id_idx on photos(album_id);
create index if not exists photos_couple_id_idx on photos(couple_id);
create index if not exists photos_location_idx on photos(latitude, longitude) where latitude is not null and longitude is not null;

-- RLS Policies for albums
alter table albums enable row level security;

create policy "Couples can view their albums"
  on albums for select
  using (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

create policy "Couples can create albums"
  on albums for insert
  with check (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

create policy "Couples can update their albums"
  on albums for update
  using (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

create policy "Couples can delete their albums"
  on albums for delete
  using (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

-- RLS Policies for photos
alter table photos enable row level security;

create policy "Couples can view their photos"
  on photos for select
  using (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

create policy "Couples can upload photos"
  on photos for insert
  with check (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

create policy "Couples can update their photos"
  on photos for update
  using (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

create policy "Couples can delete their photos"
  on photos for delete
  using (
    couple_id in (
      select couple_id from couple_members where user_id = auth.uid()
    )
  );

-- Create storage buckets (to be run in Supabase dashboard or via API)
-- Note: Storage bucket creation is typically done via Supabase dashboard
-- Buckets needed:
-- 1. 'couple-photos' (public: false)
-- 2. 'couple-photos-private' (public: false)

-- Drop bucket_items table and related data
drop table if exists bucket_items cascade;
