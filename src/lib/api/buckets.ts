import { supabase } from '@/lib/supabase/client'
import { Bucket, BucketItem } from '@/lib/types'

export async function getBuckets(coupleId: string) {
  const { data, error } = await supabase
    .from('buckets')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Bucket[]
}

export async function createBucket(bucket: Omit<Bucket, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('buckets')
    .insert(bucket)
    .select()
    .single()

  if (error) throw error
  return data as Bucket
}

export async function deleteBucket(bucketId: string) {
  const { error } = await supabase
    .from('buckets')
    .delete()
    .eq('id', bucketId)

  if (error) throw error
}

export async function getBucketItems(bucketId: string) {
  const { data, error } = await supabase
    .from('bucket_items')
    .select('*')
    .eq('bucket_id', bucketId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as BucketItem[]
}

export async function addBucketItem(item: Omit<BucketItem, 'id' | 'created_at' | 'is_completed'>) {
  const { data, error } = await supabase
    .from('bucket_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data as BucketItem
}

export async function toggleBucketItem(itemId: string, isCompleted: boolean) {
  const { data, error } = await supabase
    .from('bucket_items')
    .update({ is_completed: isCompleted })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data as BucketItem
}

export async function deleteBucketItem(itemId: string) {
  const { error } = await supabase
    .from('bucket_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}
