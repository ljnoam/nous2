'use client'

import HeartBackground from '@/components/home/HeartBackground'
import AvatarUploader from '@/components/profile/AvatarUploader'
import Preferences from '@/components/profile/Preferences'
import Security from '@/components/profile/Security'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import { supabase } from '@/lib/supabase/client'
import { Bell, BellOff, Heart, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import OneSignal from 'react-onesignal'
import { usePWAStatus } from '@/hooks/usePWAStatus'



type CoupleStatus = {
  couple_id: string
  started_at: string
  join_code: string | null
  members_count: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { isStandalone } = usePWAStatus()
  const [me, setMe] = useState<any>(null)
  const [profile, setProfile] = useState<{ first_name?: string | null; avatar_url?: string | null } | null>(null)
  const [status, setStatus] = useState<CoupleStatus | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [firstNameInput, setFirstNameInput] = useState('')
  const [partner, setPartner] = useState<{ first_name?: string | null; display_name?: string | null; avatar_url?: string | null } | null>(null)
  const [streak, setStreak] = useState(0)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showEditStart, setShowEditStart] = useState(false)
  const [editDate, setEditDate] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        router.replace('/register')
        return
      }
      const user = s.session.user
      setMe(user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      setProfile(prof ?? null)
      setFirstNameInput(prof?.first_name ?? '')

      const { data: cm } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).maybeSingle()
      if (!cm?.couple_id) {
        router.replace('/onboarding')
        return
      }

      const { data: c } = await supabase.from('couples').select('id, started_at, join_code').eq('id', cm.couple_id).maybeSingle()
      // Fetch partner id first, then their profile to avoid PostgREST nested join across schemas
      const { data: partnerRow } = await supabase
        .from('couple_members')
        .select('user_id')
        .eq('couple_id', cm.couple_id)
        .neq('user_id', user.id)
        .maybeSingle()

      let partnerProf: { first_name?: string | null; display_name?: string | null; avatar_url?: string | null } | null = null
      if (partnerRow?.user_id) {
        const { data: prof2 } = await supabase
          .from('profiles')
          .select('first_name, display_name, avatar_url')
          .eq('id', partnerRow.user_id)
          .maybeSingle()
        partnerProf = prof2 ?? null
      }

      setPartner(partnerProf)

      const { count } = await supabase.from('couple_members').select('*', { count: 'exact', head: true }).eq('couple_id', cm.couple_id)
      setStatus(c ? { couple_id: c.id, started_at: c.started_at, join_code: (c as any).join_code, members_count: count ?? 0 } : null)
    })()
  }, [router])

  // Streak: consecutive days with at least 1 note authored by me
  useEffect(() => {
    if (!me?.id) return
    let aborted = false
    const compute = async () => {
      const since = new Date(); since.setDate(since.getDate() - 120)
      const { data } = await supabase
        .from('love_notes')
        .select('created_at')
        .eq('author_id', me.id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
      if (aborted) return
      const days = new Set<string>()
      ;(data || []).forEach((r: any) => {
        const d = new Date(r.created_at)
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`
        days.add(key)
      })
      // walk back from today
      let cur = new Date();
      let s = 0
      for (;;) {
        const key = `${cur.getUTCFullYear()}-${cur.getUTCMonth()+1}-${cur.getUTCDate()}`
        if (days.has(key)) { s += 1; } else { break }
        cur.setUTCDate(cur.getUTCDate() - 1)
      }
      setStreak(s)
    }
    compute()
    const ch = supabase
      .channel('streak_notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'love_notes', filter: `author_id=eq.${me.id}` }, compute)
      .subscribe()
    return () => { aborted = true; supabase.removeChannel(ch) }
  }, [me?.id])

  function ringStyleForStreak(n: number) {
    const max = 30
    const ratio = Math.max(0, Math.min(1, n / max))
    const deg = Math.round(360 * ratio)
    return {
      background: `conic-gradient(#ec4899 ${deg}deg, transparent ${deg}deg 360deg)`,
    } as any
  }

  function fmtDateInput(d: string) {
    const dt = new Date(d)
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth()+1).padStart(2,'0')
    const dd = String(dt.getDate()).padStart(2,'0')
    return `${yyyy}-${mm}-${dd}`
  }

  async function saveStartDate() {
    if (!status?.couple_id || !editDate) { setShowEditStart(false); return }
    const { error } = await supabase.from('couples').update({ started_at: editDate }).eq('id', status.couple_id)
    if (error) { alert(error.message) } else {
      setStatus((s) => s ? { ...s, started_at: editDate } : s)
    }
    setShowEditStart(false)
  }

  const daysTogether = useMemo(() => {
    if (!status?.started_at) return null
    const start = new Date(status.started_at)
    const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    const now = new Date()
    const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    return Math.max(0, Math.floor((b - a) / (24 * 3600 * 1000)))
  }, [status?.started_at])

  async function saveFirstName() {
    if (!me) return
    const n = firstNameInput.trim()
    const { error } = await supabase.from('profiles').update({ first_name: n || null }).eq('id', me.id)
    if (!error) {
      setProfile((p) => ({ ...(p ?? {}), first_name: n || null }))
      setEditingName(false)
    } else alert(error.message)
  }

  async function onAvatarChange(url: string) {
    setProfile((p) => ({ ...(p ?? {}), avatar_url: url }))
  }

  async function logout() {
    setShowLogoutConfirm(true)
  }

  async function confirmLogout() {
    await supabase.auth.signOut()
    router.replace('/register')
  }



  return (
    <>
      <HeartBackground />
      <main className="relative z-10 space-y-6 pt-8 pb-28 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Salut {profile?.first_name || 'toi'} 👋</h1>
        <DarkModeToggle />
      </div>

      {/* Profil */}
      {me && (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md shadow p-5 flex flex-col items-center sm:flex-row gap-4">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full" style={ringStyleForStreak(streak)}></div>
            <div className="relative">
              <AvatarUploader userId={me.id} avatarUrl={profile?.avatar_url} onChange={onAvatarChange} />
              {streak > 0 && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[11px] px-2 py-0.5 rounded-full bg-pink-500 text-white shadow">{streak}🔥</span>
              )}
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            {!editingName ? (
              <div className="flex flex-col items-center sm:items-start gap-1">
                <p className="text-lg font-semibold">{profile?.first_name || 'Prénom non défini'}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs rounded-full px-3 py-1 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  Modifier
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <input
                  value={firstNameInput}
                  onChange={(e) => setFirstNameInput(e.target.value)}
                  placeholder="Ton prénom"
                  className="rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 outline-none text-sm"
                />
                <button
                  onClick={saveFirstName}
                  className="text-xs rounded-lg px-2 py-1 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  OK
                </button>
                <button
                  onClick={() => {
                    setEditingName(false)
                    setFirstNameInput(profile?.first_name || '')
                  }}
                  className="text-xs rounded-lg px-2 py-1 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Annuler
                </button>
              </div>
            )}
            <p className="text-xs opacity-70 mt-1">{me.email}</p>
          </div>
        </div>
      )}

      {/* Couple */}
      {status && (
        <div className="rounded-2xl border border-pink-200/20 dark:border-pink-800/20 bg-gradient-to-r from-pink-50/80 to-rose-100/80 dark:from-pink-900/20 dark:to-rose-800/20 backdrop-blur-lg shadow-sm p-5 text-center">
          <Heart className="mx-auto h-5 w-5 text-pink-500 mb-1" />
          <p className="text-sm opacity-70">En couple depuis le</p>
          <p className="text-lg font-bold">{new Date(status.started_at).toLocaleDateString('fr-FR')}</p>
          <button
            onClick={() => { setEditDate(fmtDateInput(status.started_at)); setShowEditStart(true) }}
            className="mt-2 text-xs rounded-full px-3 py-1 border border-pink-400/40 hover:bg-pink-500/10"
          >Modifier la date</button>
          {daysTogether !== null && <p className="text-sm opacity-70">Soit {daysTogether} jours 🫶</p>}
          {partner && (
            <p className="text-sm mt-1">
              <span className="opacity-70">Avec </span>
              <span className="font-semibold">{partner.first_name || partner.display_name || 'Ton/ta partenaire'}</span>
            </p>
          )}
          {status.members_count < 2 && (
            <p className="text-xs opacity-60 mt-2">Code du couple : {status.join_code || '—'}</p>
          )}
        </div>
      )}

      {/* Stats */}
      <StatsRow coupleId={status?.couple_id} />

      {/* Preferences */}
      {me && <Preferences userId={me.id} />}

      {/* Security */}
      <Security />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button
          onClick={logout}
          className="flex-1 flex items-center justify-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 px-4 py-3 font-medium shadow hover:bg-white/90 dark:hover:bg-neutral-800 transition"
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </button>
      </div>
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-black/10 dark:border-white/10 max-w-sm w-[92vw]">
            <h3 className="text-lg font-semibold mb-2">Se déconnecter ?</h3>
            <p className="text-sm opacity-70 mb-4">Tu pourras te reconnecter à tout moment.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLogoutConfirm(false)} className="rounded-xl px-3 py-2 border border-black/10 dark:border-white/10">Annuler</button>
              <button onClick={confirmLogout} className="rounded-xl px-3 py-2 bg-black text-white dark:bg-white dark:text-black">Déconnexion</button>
            </div>
          </div>
        </div>
      )}

      {showEditStart && status && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-black/10 dark:border-white/10 max-w-sm w-[92vw]">
            <h3 className="text-lg font-semibold mb-2">Modifier la date</h3>
            <p className="text-sm opacity-70 mb-3">Limité à ±2 ans autour de la date actuelle.</p>
            <DateGuardInput current={status.started_at} value={editDate || ''} onChange={setEditDate} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowEditStart(false)} className="rounded-xl px-3 py-2 border border-black/10 dark:border-white/10">Annuler</button>
              <button onClick={saveStartDate} className="rounded-xl px-3 py-2 bg-pink-600 text-white hover:opacity-90">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  )
}

/* === STATS === */
function StatsRow({ coupleId }: { coupleId?: string | null }) {
  const [notes, setNotes] = useState<number | null>(null)

  useEffect(() => {
    if (!coupleId) return
    ;(async () => {
      const { count: notesCount } = await supabase.from('love_notes').select('*', { count: 'exact', head: true }).eq('couple_id', coupleId)
      setNotes(notesCount ?? 0)
    })()
  }, [coupleId])

  return (
    <div className="grid grid-cols-1 gap-3">
      <StatCard label="Mots doux échangés" value={notes ?? '…'} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 text-center shadow-sm hover:scale-[1.02] transition-transform">
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}

function DateGuardInput({ current, value, onChange }: { current: string; value: string; onChange: (v: string) => void }) {
  const cur = new Date(current)
  const min = new Date(cur); min.setFullYear(min.getFullYear() - 2)
  const max = new Date(cur); max.setFullYear(max.getFullYear() + 2)
  function fmt(d: Date) {
    const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`
  }
  return (
    <input type="date" value={value} min={fmt(min)} max={fmt(max)} onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
  )
}


