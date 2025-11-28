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

async function getPartnerId(supabase: any, userId: string, coupleId: string) {
  const { data } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId)
    .neq('user_id', userId)
    .maybeSingle()
  return data?.user_id
}

async function shouldNotify(supabase: any, userId: string, type: 'notify_notes' | 'notify_calendar' | 'notify_gallery') {
  const { data } = await supabase
    .from('user_prefs')
    .select(type)
    .eq('user_id', userId)
    .maybeSingle()
  
  // Default to true if no prefs found or column is null (as per requirement "défaut true")
  if (!data) return true
  return data[type] !== false
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
    if (partnerId) {
      const notify = await shouldNotify(supabase, partnerId, 'notify_notes')
      if (notify) {
        // Fetch user name for the message
        const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
        const name = profile?.first_name || 'Ton partenaire'
        
        await sendNotification({
          type: 'note',
          targetUserId: partnerId,
          title: 'Nouvelle Note 💌',
          message: `${name} a écrit : ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          data: { noteId: data.id, coupleId }
        })
      }
    }
  } catch (e) {
    console.error('Error sending notification:', e)
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
    if (partnerId) {
      const notify = await shouldNotify(supabase, partnerId, 'notify_calendar')
      if (notify) {
        const dateStr = new Date(eventData.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        await sendNotification({
          type: 'event',
          targetUserId: partnerId,
          title: 'Agenda 📅',
          message: `Nouvel événement : ${eventData.title} le ${dateStr}`,
          data: { eventId: data.id, coupleId: eventData.couple_id }
        })
      }
    }
  } catch (e) {
    console.error('Error sending notification:', e)
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
    if (partnerId) {
      const notify = await shouldNotify(supabase, partnerId, 'notify_gallery')
      if (notify) {
        const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
        const name = profile?.first_name || 'Ton partenaire'

        await sendNotification({
          type: 'photo',
          targetUserId: partnerId,
          title: 'Souvenirs 📷',
          message: `${name} a ajouté une nouvelle photo.`,
          data: { photoId: data.id, coupleId: photoData.couple_id }
        })
      }
    }
  } catch (e) {
    console.error('Error sending notification:', e)
  }

  return data
}
