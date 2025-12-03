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
      <main className="relative z-10 space-y-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-20 px-4">
        
        {/* Top Actions */}
        <div className="flex items-center justify-end">
          <DarkModeToggle />
        </div>

        {/* Profile Header - Center & Clean */}
        {me && (
          <div className="flex flex-col items-center text-center space-y-6 mt-4">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full opacity-70 blur-sm transition group-hover:opacity-100" style={ringStyleForStreak(streak)}></div>
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-[6px] border-white dark:border-neutral-900 shadow-2xl relative overflow-hidden">
                   <AvatarUploader userId={me.id} avatarUrl={profile?.avatar_url} onChange={onAvatarChange} />
                </div>
                {streak > 0 && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold px-3 py-1 rounded-full bg-pink-500 text-white shadow-lg border-[3px] border-white dark:border-neutral-900 z-10 whitespace-nowrap">
                    {streak} 🔥
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              {!editingName ? (
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    {profile?.first_name || 'Prénom non défini'}
                  </h1>
                  <button
                    onClick={() => setEditingName(true)}
                    className="opacity-40 hover:opacity-100 transition p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <input
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    placeholder="Ton prénom"
                    className="w-40 text-center rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 outline-none text-lg font-bold"
                    autoFocus
                  />
                  <button onClick={saveFirstName} className="text-xs bg-black text-white dark:bg-white dark:text-black rounded-lg px-2 py-1">OK</button>
                  <button onClick={() => { setEditingName(false); setFirstNameInput(profile?.first_name || '') }} className="text-xs opacity-60 px-2">Annuler</button>
                </div>
              )}
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{me.email}</p>
            </div>
          </div>
        )}

        {/* Couple Status Card - Compact */}
        {status && (
          <div className="rounded-3xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-sm p-4 flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Heart className="w-16 h-16 text-pink-500 rotate-12" />
              </div>
            
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-500">En couple depuis</span>
            
            <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full z-10">
              <span className="text-base font-medium text-neutral-900 dark:text-white">
                {new Date(status.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => { setEditDate(fmtDateInput(status.started_at)); setShowEditStart(true) }} 
                className="opacity-40 hover:opacity-100 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </button>
            </div>

            {partner && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                avec <span className="font-semibold text-neutral-900 dark:text-white">{partner.first_name || partner.display_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Settings Section */}
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1">Paramètres</h3>
          {me && <Preferences userId={me.id} />}
          <Security />
        </div>

        {/* Logout */}
        <div className="pt-4 pb-8 flex justify-center">
          <button
            onClick={logout}
            className="group flex items-center gap-2 text-neutral-400 hover:text-red-500 transition-colors text-sm font-medium px-4 py-2"
          >
            <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
            Se déconnecter
          </button>
        </div>

        {/* Modals */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-black/10 dark:border-white/10 max-w-sm w-[90vw] shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold mb-2 text-center">Se déconnecter ?</h3>
              <p className="text-sm text-neutral-500 text-center mb-6">Tu pourras te reconnecter à tout moment.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-2xl px-4 py-3 font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">Annuler</button>
                <button onClick={confirmLogout} className="flex-1 rounded-2xl px-4 py-3 font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition">Déconnexion</button>
              </div>
            </div>
          </div>
        )}

        {showEditStart && status && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-black/10 dark:border-white/10 max-w-sm w-[90vw] shadow-2xl">
              <h3 className="text-lg font-bold mb-2">Modifier la date</h3>
              <p className="text-sm text-neutral-500 mb-4">Limité à ±2 ans autour de la date actuelle.</p>
              <DateGuardInput current={status.started_at} value={editDate || ''} onChange={setEditDate} />
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowEditStart(false)} className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">Annuler</button>
                <button onClick={saveStartDate} className="rounded-xl px-4 py-2 bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition shadow-lg shadow-pink-500/20">Enregistrer</button>
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
    <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl p-6 text-center shadow-sm hover:scale-[1.02] transition-transform flex flex-col items-center justify-center h-full">
      <div className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</div>
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


