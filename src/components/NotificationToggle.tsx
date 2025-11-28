'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import OneSignal from 'react-onesignal'
import { usePWAStatus } from '@/hooks/usePWAStatus'

export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(false)
  const { isStandalone } = usePWAStatus()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initial check
    const checkStatus = () => {
      if (!isStandalone) {
        setEnabled(false)
        setLoading(false)
        return
      }

      try {
        const optedIn = OneSignal.User.PushSubscription.optedIn
        setEnabled(!!optedIn)
      } catch (e) {
        console.error("OneSignal status check error:", e)
      }
      setLoading(false)
    }

    // Wait a bit for OneSignal to initialize if needed, though OneSignalInit should have run
    const t = setTimeout(checkStatus, 1000)

    // Listen for changes
    const onChange = (event: any) => {
      if (!isStandalone) {
        setEnabled(false)
        return
      }
      setEnabled(!!event.current.optedIn)
    }

    try {
      OneSignal.User.PushSubscription.addEventListener('change', onChange)
    } catch (e) {
      // OneSignal might not be ready
    }

    return () => {
      clearTimeout(t)
      try {
        OneSignal.User.PushSubscription.removeEventListener('change', onChange)
      } catch {}
    }
  }, [isStandalone])

  async function toggle() {
    if (!isStandalone) {
      alert("Veuillez installer l'application sur votre écran d'accueil pour activer les notifications.")
      return
    }

    setLoading(true)
    try {
      if (enabled) {
        // Disable
        await OneSignal.User.PushSubscription.optOut()
        setEnabled(false)
      } else {
        // Enable
        // First ensure we have permission
        if (OneSignal.Notifications.permission !== true) {
            await OneSignal.Notifications.requestPermission()
        }
        await OneSignal.User.PushSubscription.optIn()
        setEnabled(true)
      }
    } catch (e) {
      console.error("Error toggling notifications:", e)
      alert("Erreur lors du changement d'état des notifications.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between ${!isStandalone ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${enabled ? 'bg-pink-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
            {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Notifications Push</span>
            <span className="text-xs opacity-60">
                {!isStandalone ? 'Installation requise' : (enabled ? 'Activées sur cet appareil' : 'Désactivées sur cet appareil')}
            </span>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-pink-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
        >
          <span className={`block h-4 w-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'} mt-1`} />
        </button>
      </div>
  )
}
