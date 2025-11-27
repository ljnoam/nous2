'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Bell, BellOff } from 'lucide-react'

type Dnd = { start: string; end: string }

type PreferencesProps = {
  userId: string
  pushEnabled: boolean
  onTogglePush: () => void
}

export default function Preferences({ userId, pushEnabled, onTogglePush }: PreferencesProps) {
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState(true)
  const [bucket, setBucket] = useState(true)
  const [events, setEvents] = useState(true)
  const [dnd, setDnd] = useState<Dnd>({ start: '22:00', end: '07:00' })

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('user_prefs')
        .select('notes_enabled, bucket_enabled, events_enabled, do_not_disturb')
        .eq('user_id', userId)
        .maybeSingle()
      if (data) {
        setNotes(!!data.notes_enabled)
        setBucket(!!data.bucket_enabled)
        setEvents(!!data.events_enabled)
        const dj = (data.do_not_disturb as any) || {}
        setDnd({ start: dj.start || '22:00', end: dj.end || '07:00' })
      }
      setLoading(false)
    })()
  }, [userId])

  async function persist(next: {
    notes_enabled?: boolean
    bucket_enabled?: boolean
    events_enabled?: boolean
    do_not_disturb?: Dnd
  }) {
    const payload: any = { user_id: userId }
    if (next.notes_enabled !== undefined) payload.notes_enabled = next.notes_enabled
    if (next.bucket_enabled !== undefined) payload.bucket_enabled = next.bucket_enabled
    if (next.events_enabled !== undefined) payload.events_enabled = next.events_enabled
    if (next.do_not_disturb !== undefined) payload.do_not_disturb = next.do_not_disturb

    const { error } = await supabase.from('user_prefs').upsert(payload)
    if (error) alert(error.message)
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Préférences de notifications</h2>
      </div>

      {/* Master Toggle */}
      <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${pushEnabled ? 'bg-pink-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
            {pushEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Notifications Push</span>
            <span className="text-xs opacity-60">{pushEnabled ? 'Activées sur cet appareil' : 'Désactivées sur cet appareil'}</span>
          </div>
        </div>
        <button
          onClick={onTogglePush}
          className={`relative h-6 w-11 rounded-full transition-colors ${pushEnabled ? 'bg-pink-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
        >
          <span className={`block h-4 w-4 bg-white rounded-full transition-transform ${pushEnabled ? 'translate-x-6' : 'translate-x-1'} mt-1`} />
        </button>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${!pushEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Toggle label="Mots doux" checked={notes} disabled={loading || !pushEnabled} onChange={(v) => { setNotes(v); persist({ notes_enabled: v }) }} />
        <Toggle label="Bucket list" checked={bucket} disabled={loading || !pushEnabled} onChange={(v) => { setBucket(v); persist({ bucket_enabled: v }) }} />
        <Toggle label="Événements" checked={events} disabled={loading || !pushEnabled} onChange={(v) => { setEvents(v); persist({ events_enabled: v }) }} />
      </div>
      
      <div className={`pt-2 ${!pushEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <p className="text-sm opacity-70 mb-2">Ne pas déranger</p>
        <div className="flex items-center gap-3">
          <TimeInput value={dnd.start} onChange={(v) => { const x = { ...dnd, start: v }; setDnd(x); persist({ do_not_disturb: x }) }} />
          <span className="opacity-60 text-sm">—</span>
          <TimeInput value={dnd.end} onChange={(v) => { const x = { ...dnd, end: v }; setDnd(x); persist({ do_not_disturb: x }) }} />
        </div>
        <p className="text-xs opacity-60 mt-1">Silence entre ces heures locales.</p>
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

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
    />
  )
}


