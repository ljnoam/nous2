# Instructions pour configurer Supabase

## 1. Exécuter la migration SQL

Va dans le Supabase Dashboard → SQL Editor et exécute le fichier :
`supabase/migrations/20250124_create_albums_and_photos.sql`

## 2. Créer les Storage Buckets

Dans Supabase Dashboard → Storage, crée deux buckets :

### Bucket 1: `couple-photos`
- **Name**: `couple-photos`
- **Public**: ❌ Non (privé)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*`

**RLS Policy** (à ajouter):
```sql
create policy "Couples can upload photos"
on storage.objects for insert
with check (
  bucket_id = 'couple-photos' AND
  (storage.foldername(name))[1] in (
    select couple_id::text from couple_members where user_id = auth.uid()
  )
);

create policy "Couples can view their photos"
on storage.objects for select
using (
  bucket_id = 'couple-photos' AND
  (storage.foldername(name))[1] in (
    select couple_id::text from couple_members where user_id = auth.uid()
  )
);

create policy "Couples can delete their photos"
on storage.objects for delete
using (
  bucket_id = 'couple-photos' AND
  (storage.foldername(name))[1] in (
    select couple_id::text from couple_members where user_id = auth.uid()
  )
);
```

### Bucket 2: `couple-photos-private`
- **Name**: `couple-photos-private`
- **Public**: ❌ Non (privé)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/*`

**RLS Policy** (identique au bucket normal):
```sql
create policy "Couples can upload private photos"
on storage.objects for insert
with check (
  bucket_id = 'couple-photos-private' AND
  (storage.foldername(name))[1] in (
    select couple_id::text from couple_members where user_id = auth.uid()
  )
);

create policy "Couples can view their private photos"
on storage.objects for select
using (
  bucket_id = 'couple-photos-private' AND
  (storage.foldername(name))[1] in (
    select couple_id::text from couple_members where user_id = auth.uid()
  )
);

create policy "Couples can delete their private photos"
on storage.objects for delete
using (
  bucket_id = 'couple-photos-private' AND
  (storage.foldername(name))[1] in (
    select couple_id::text from couple_members where user_id = auth.uid()
  )
);
```

## 3. Structure des fichiers

Les photos seront organisées comme suit :
```
couple-photos/
  └── {couple_id}/
      └── {album_id}/
          └── {photo_id}.jpg

couple-photos-private/
  └── {couple_id}/
      └── {album_id}/
          └── {photo_id}.jpg
```

## Note

Une fois ces étapes complétées, l'application pourra uploader et gérer les photos !
