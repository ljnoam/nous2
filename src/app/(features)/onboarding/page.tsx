'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Status = { couple_id: string|null; join_code?: string|null; started_at?: string|null; members_count?: number|null }

async function fetchStatus(): Promise<Status> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return { couple_id: null }
  const { data, error } = await supabase
    .from('my_couple_status')
    .select('*')
    .eq('user_id', session.session.user.id)
    .maybeSingle()
  if (error) throw error
  return data ? {
    couple_id: data.couple_id,
    join_code: data.join_code,
    started_at: data.started_at,
    members_count: data.members_count,
  } : { couple_id: null }
}

export default function Onboarding() {
  const router = useRouter()
  const [mode, setMode] = useState<'create'|'join'>('create')
  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString().slice(0,10))
  const [code, setCode] = useState('')

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) { router.replace('/register'); return }

      const st = await fetchStatus()
      if (!st.couple_id) return

      if (st.members_count === 1) {
        router.replace('/waiting')
      } else if (st.members_count === 2) {
        router.replace('/home')
      }
    })()
  }, [router])

  return (
    <main className="min-h-screen min-h-[var(--viewport-height)] w-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-5 sm:p-6">
          <div className="mb-4 text-center">
            <h1 className="text-xl font-semibold">Crée ou rejoins ton couple</h1>
            <p className="text-sm opacity-70 mt-1">Deux options pour démarrer</p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl px-3 py-2 text-sm border ${mode==='create' ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-black/10 dark:border-white/10'}`}
              onClick={() => setMode('create')}
              type="button"
            >Créer</button>
            <button
              className={`rounded-xl px-3 py-2 text-sm border ${mode==='join' ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-black/10 dark:border-white/10'}`}
              onClick={() => setMode('join')}
              type="button"
            >Rejoindre</button>
          </div>

          {mode==='create' ? (
            <form className="space-y-3" onSubmit={async (e)=> {
              e.preventDefault()
              const { error } = await supabase.rpc('create_couple', { p_started_at: startedAt })
              if (error) { alert(error.message); return }
              router.replace('/waiting')
            }}>
              <label className="block">
                <span className="mb-1 block text-sm opacity-70">Date de mise en couple</span>
                <input type="date" value={startedAt} onChange={e=>setStartedAt(e.target.value)} className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 px-3 py-2.5" />
              </label>
              <button className="w-full rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 font-medium">Créer</button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={async (e)=> {
              e.preventDefault()
              const { error } = await supabase.rpc('join_couple', { p_join_code: code.trim().toUpperCase() })
              if (error) { alert(error.message); return }
              router.replace('/home')
            }}>
              <label className="block">
                <span className="mb-1 block text-sm opacity-70">Code couple</span>
                <input value={code} onChange={e=>setCode(e.target.value)} className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 px-3 py-2.5" placeholder="ABC123" />
              </label>
              <button className="w-full rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 font-medium">Rejoindre</button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
