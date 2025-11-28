'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import NotificationToggle from '@/components/NotificationToggle'

type PreferencesProps = {
  userId: string
}

export default function Preferences({ userId }: PreferencesProps) {
  const [loading, setLoading] = useState(true)
  const [notifyNotes, setNotifyNotes] = useState(true)
  const [notifyCalendar, setNotifyCalendar] = useState(true)
  const [notifyGallery, setNotifyGallery] = useState(true)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('user_prefs')
        .select('notify_notes, notify_calendar, notify_gallery')
        .eq('user_id', userId)
        .maybeSingle()
      if (data) {
        setNotifyNotes(data.notify_notes !== false) // Default true
        setNotifyCalendar(data.notify_calendar !== false)
        setNotifyGallery(data.notify_gallery !== false)
      }
      setLoading(false)
    })()
  }, [userId])

  async function persist(next: {
    notify_notes?: boolean
    notify_calendar?: boolean
    notify_gallery?: boolean
  }) {
    const payload: any = { user_id: userId }
    if (next.notify_notes !== undefined) payload.notify_notes = next.notify_notes
    if (next.notify_calendar !== undefined) payload.notify_calendar = next.notify_calendar
    if (next.notify_gallery !== undefined) payload.notify_gallery = next.notify_gallery

    const { error } = await supabase.from('user_prefs').upsert(payload)
    if (error) alert(error.message)
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Préférences de notifications</h2>
      </div>

      {/* Master Toggle (OneSignal Permission) */}
      <NotificationToggle />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Toggle label="Nouvelles Notes" checked={notifyNotes} disabled={loading} onChange={(v) => { setNotifyNotes(v); persist({ notify_notes: v }) }} />
        <Toggle label="Agenda / Événements" checked={notifyCalendar} disabled={loading} onChange={(v) => { setNotifyCalendar(v); persist({ notify_calendar: v }) }} />
        <Toggle label="Nouvelles Photos" checked={notifyGallery} disabled={loading} onChange={(v) => { setNotifyGallery(v); persist({ notify_gallery: v }) }} />
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-xl px-4 py-3 border transition ${
        checked
          ? 'bg-pink-50/70 dark:bg-pink-900/20 border-pink-300/40 dark:border-pink-700/30'
          : 'bg-white/70 dark:bg-neutral-900/60 border-black/10 dark:border-white/10'
      }`}
    >
      <span className="text-sm">{label}</span>
      <span
        className={`h-5 w-10 rounded-full p-[2px] transition ${checked ? 'bg-pink-500/80' : 'bg-neutral-400/50'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`block h-4 w-4 bg-white rounded-full transition ${checked ? 'translate-x-5' : ''}`}></span>
      </span>
    </button>
  )
}


