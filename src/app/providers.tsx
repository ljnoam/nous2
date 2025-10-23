'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { flushOutbox } from '@/lib/outbox'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    // Silently clear stale/invalid sessions that cause 400 refresh errors
    supabase.auth.getSession().then(({ error }) => {
      if (error && /Invalid Refresh Token/i.test(String(error.message))) {
        supabase.auth.signOut().catch(() => {})
      }
    })

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('[SW] enregistré'))
        .catch((err) => console.warn('[SW] erreur', err))
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (ev) => {
        if (ev.data === 'FLUSH_OUTBOX') {
          flushOutbox()
        }
        if (ev.data === 'REFRESH_DONE') {
          // Soft refresh server components; components can also listen to 'app:refresh'
          try { router.refresh() } catch {}
          try { document.dispatchEvent(new Event('app:refresh')) } catch {}
          try { document.dispatchEvent(new Event('visibilitychange')) } catch {}
        }
      })
    }

    window.addEventListener('online', async () => {
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
    })
  }, [])

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
