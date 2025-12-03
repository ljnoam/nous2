'use client'

import { useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import LimboScreen from './LimboScreen'

export default function LimboGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [limboState, setLimboState] = useState<{
    coupleId: string
    deletionScheduledAt: string
    deletionInitiatedBy: string
    currentUserId: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function checkStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Get couple status
        const { data: cm } = await supabase
          .from('couple_members')
          .select('couple_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (cm?.couple_id) {
          const { data: couple } = await supabase
            .from('couples')
            .select('id, deletion_scheduled_at, deletion_initiated_by')
            .eq('id', cm.couple_id)
            .single()

          if (couple?.deletion_scheduled_at && couple?.deletion_initiated_by) {
            if (mounted) {
              setLimboState({
                coupleId: couple.id,
                deletionScheduledAt: couple.deletion_scheduled_at,
                deletionInitiatedBy: couple.deletion_initiated_by,
                currentUserId: user.id
              })
            }
          }
        }
      } catch (e) {
        console.error('Error checking limbo status:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    checkStatus()

    return () => { mounted = false }
  }, [])

  if (loading) {
    // Optional: render a loading spinner or just nothing (transparent)
    // Rendering children while loading might cause a flash of content before blocking
    // Rendering nothing is safer for a guard
    return <div className="min-h-screen bg-white dark:bg-neutral-950" /> 
  }

  if (limboState) {
    return <LimboScreen {...limboState} />
  }

  return <>{children}</>
}
