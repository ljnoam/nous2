'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { flushOutbox } from '@/lib/outbox'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { enablePush } from '@/lib/push'

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    // Silently clear stale/invalid sessions that cause 400 refresh errors
    supabase.auth.getSession().then(({ error }) => {
      if (error && /Invalid Refresh Token/i.test(String(error.message))) {
        supabase.auth.signOut().catch(() => {})
      }
    })

    const ensurePushSubscription = async (force = false) => {
      try {
        if (typeof window === 'undefined') return
        if (!('Notification' in window) || Notification.permission !== 'granted') return
        if (!('serviceWorker' in navigator)) return
        await enablePush({ forceResubscribe: force })
      } catch (err) {
        console.warn('[push] auto ensure failed', err)
      }
    }

    const onSwMessage = (ev: MessageEvent<any>) => {
      const payload = ev.data
      if (payload === 'FLUSH_OUTBOX') {
        flushOutbox()
        return
      }
      if (payload === 'REFRESH_DONE') {
        // Soft refresh server components; components can also listen to 'app:refresh'
        try { router.refresh() } catch {}
        try { document.dispatchEvent(new Event('app:refresh')) } catch {}
        try { document.dispatchEvent(new Event('visibilitychange')) } catch {}
        return
      }
      if (payload && typeof payload === 'object') {
        const type = (payload as { type?: string }).type
        if (type === 'PUSH_SUBSCRIPTION_CHANGED') {
          ensurePushSubscription(true).catch(() => {})
        }
        if (type === 'PUSH_SUBSCRIPTION_RENEWED') {
          ensurePushSubscription(false).catch(() => {})
        }
      }
    }

    const onOnline = async () => {
      flushOutbox()
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          // Try Background Sync first
          if ('SyncManager' in window && 'sync' in reg) {
            try { await reg.sync.register('pages-sync') }
            catch {
              // Fallback: ask SW to refresh routes immediately
              navigator.serviceWorker.controller?.postMessage('REFRESH_ROUTES')
            }
          } else {
            navigator.serviceWorker.controller?.postMessage('REFRESH_ROUTES')
          }
        }
      } catch {}
    }

    const swUrl = '/sw.js?v=20251023'
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(swUrl)
        .then(() => {
          console.log('[SW] enregistré')
          ensurePushSubscription(false).catch(() => {})
        })
        .catch((err) => console.warn('[SW] erreur', err))

      navigator.serviceWorker.addEventListener('message', onSwMessage)
    }

    window.addEventListener('online', onOnline)

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage)
      }
      window.removeEventListener('online', onOnline)
    }
  }, [router])

  useEffect(() => {
    const updateViewportHeight = () => {
      const visualViewport = window.visualViewport
      const height = visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--viewport-height', `${height}px`)
    }

    updateViewportHeight()

    window.addEventListener('resize', updateViewportHeight)
    window.addEventListener('orientationchange', updateViewportHeight)
    window.visualViewport?.addEventListener('resize', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
      window.visualViewport?.removeEventListener('resize', updateViewportHeight)
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
