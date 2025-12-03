'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendNotification } from './notifications'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

import { createClient } from '@supabase/supabase-js'

async function getPartnerId(supabase: any, userId: string, coupleId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log('[getPartnerId] Service Key present:', !!serviceKey)
  console.log('[getPartnerId] Supabase URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Cannot bypass RLS for partner lookup.')
    return null
  }

  // Use Service Role to bypass RLS and ensure we can see the partner
  let adminAuthClient
  try {
    adminAuthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )
  } catch (e) {
    console.error('[getPartnerId] Failed to create admin client:', e)
    return null
  }

  const { data } = await adminAuthClient
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .neq('user_id', userId)
    .maybeSingle()
  
  return data?.user_id
}

async function shouldNotify(supabase: any, userId: string, type: 'notify_notes' | 'notify_calendar' | 'notify_gallery') {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Cannot bypass RLS for preferences.')
    // Fallback to regular client (might fail if RLS prevents reading partner prefs)
    // But actually, if we can't read prefs, we should probably assume TRUE or FALSE?
    // Let's try with the passed 'supabase' client which is user-scoped.
    // If RLS allows reading partner's prefs (e.g. "couple members can view each other's prefs"), this works.
    // If not, it returns null/error.
    const { data } = await supabase
        .from('user_prefs')
        .select(type)
        .eq('user_id', userId)
        .maybeSingle()
    if (!data) return true
    return (data as any)[type] !== false
  }

  // Also use admin client for prefs to ensure we can read partner's prefs
  const adminAuthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data } = await adminAuthClient
    .from('user_prefs')
    .select(type)
    .eq('user_id', userId)
    .maybeSingle()
  
  // Default to true if no prefs found or column is null (as per requirement "défaut true")
  if (!data) return true
  return (data as any)[type] !== false
}

export async function createNote(content: string, coupleId: string) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Create Note
  const { data, error } = await supabase
    .from('love_notes')
    .insert({
      content,
      couple_id: coupleId,
      author_id: user.id,
    })
    .select()
    .single()

  if (error) throw error

  // 2. Notify Partner
  try {
    const partnerId = await getPartnerId(supabase, user.id, coupleId)
    console.log('[createNote] Partner ID:', partnerId)
    
    if (partnerId) {
      const notify = await shouldNotify(supabase, partnerId, 'notify_notes')
      console.log('[createNote] Notify preference:', notify)
      
      if (notify) {
        // Fetch user name for the message
        const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
        const name = profile?.first_name || 'Ton partenaire'
        
        console.log('[createNote] Sending notification to:', partnerId)
        await sendNotification({
          type: 'note',
          targetUserId: partnerId,
          title: 'Nouvelle Note 💌',
          message: `${name} a écrit : ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          data: { noteId: data.id, coupleId }
        })
      }
    } else {
        console.log('[createNote] No partner found for couple:', coupleId)
    }
  } catch (e) {
    console.error('[createNote] Error sending notification:', e)
  }

  return data
}

export async function createEvent(eventData: any) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Create Event
  const { data, error } = await supabase
    .from('couple_events')
    .insert({
      ...eventData,
      author_id: user.id,
    })
    .select()
    .single()

  if (error) throw error

  // 2. Notify Partner
  try {
    const partnerId = await getPartnerId(supabase, user.id, eventData.couple_id)
    console.log('[createEvent] Partner ID:', partnerId)

    if (partnerId) {
      const notify = await shouldNotify(supabase, partnerId, 'notify_calendar')
      console.log('[createEvent] Notify preference:', notify)

      if (notify) {
        const dateStr = new Date(eventData.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        console.log('[createEvent] Sending notification to:', partnerId)
        
        await sendNotification({
          type: 'event',
          targetUserId: partnerId,
          title: 'Agenda 📅',
          message: `Nouvel événement : ${eventData.title} le ${dateStr}`,
          data: { eventId: data.id, coupleId: eventData.couple_id }
        })
      }
    } else {
        console.log('[createEvent] No partner found')
    }
  } catch (e) {
    console.error('[createEvent] Error sending notification:', e)
  }

  return data
}

// For photos, usually the upload happens client-side to storage, then we insert a record.
// We'll assume the client uploads the file and passes the path/url here, OR we just handle the DB insert.
// Based on "uploadPhoto", let's assume we are recording the photo entry in the DB.
export async function uploadPhoto(photoData: any) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Create Photo Record (assuming 'photos' table or similar, user said "photos : Les tables de contenu")
  // Need to verify table name. User said "photos".
  const { data, error } = await supabase
    .from('photos')
    .insert({
      ...photoData,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) throw error

  // 2. Notify Partner
  try {
    const partnerId = await getPartnerId(supabase, user.id, photoData.couple_id)
    console.log('[uploadPhoto] Partner ID:', partnerId)

    if (partnerId) {
      const notify = await shouldNotify(supabase, partnerId, 'notify_gallery')
      console.log('[uploadPhoto] Notify preference:', notify)

      if (notify) {
        const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
        const name = profile?.first_name || 'Ton partenaire'

        console.log('[uploadPhoto] Sending notification to:', partnerId)
        await sendNotification({
          type: 'photo',
          targetUserId: partnerId,
          title: 'Souvenirs 📷',
          message: `${name} a ajouté une nouvelle photo.`,
          data: { photoId: data.id, coupleId: photoData.couple_id }
        })
      }
    } else {
        console.log('[uploadPhoto] No partner found')
    }
  } catch (e) {
    console.error('[uploadPhoto] Error sending notification:', e)
  }

  return data
}

export async function createBucketItem(itemData: { bucket_id: string, content: string, couple_id: string }) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1. Create Bucket Item
  const { data, error } = await supabase
    .from('bucket_items')
    .insert({
      bucket_id: itemData.bucket_id,
      content: itemData.content,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error

  // 2. Notify Partner
  try {
    const partnerId = await getPartnerId(supabase, user.id, itemData.couple_id)
    console.log('[createBucketItem] Partner ID:', partnerId)

    if (partnerId) {
      const notify = await shouldNotify(supabase, partnerId, 'notify_notes')
      console.log('[createBucketItem] Notify preference:', notify)

      if (notify) {
        const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
        const name = profile?.first_name || 'Ton partenaire'

        const { data: bucket } = await supabase.from('buckets').select('title').eq('id', itemData.bucket_id).single()
        const bucketTitle = bucket?.title || 'une liste'

        console.log('[createBucketItem] Sending notification to:', partnerId)
        await sendNotification({
          type: 'bucket_item',
          targetUserId: partnerId,
          title: 'Nouvelle idée 💡',
          message: `${name} a ajouté "${itemData.content}" dans ${bucketTitle}`,
          data: { bucketId: itemData.bucket_id, coupleId: itemData.couple_id }
        })
      }
    }
  } catch (e) {
    console.error('[createBucketItem] Error sending notification:', e)
  }

  return data
}
