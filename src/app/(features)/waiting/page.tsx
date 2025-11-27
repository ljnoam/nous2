'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Share2, Copy, Check } from 'lucide-react'

export default function WaitingPage() {
  const router = useRouter()
  const [code, setCode] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) { router.replace('/register'); return }

      const { data, error } = await supabase
        .from('my_couple_status')
        .select('*')
        .eq('user_id', s.session.user.id)
        .single()

      if (error) { console.error(error); return }

      if (!data?.couple_id) { router.replace('/onboarding'); return }

      setCode(data.join_code)

      if (data.members_count === 2) { router.replace('/home'); return }

      const channel = supabase
        .channel('couple_waiting')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_members', filter: `couple_id=eq.${data.couple_id}`},
          async () => {
            const { data: st } = await supabase
              .from('my_couple_status').select('*').eq('user_id', s.session!.user.id).single()
            if (st?.members_count === 2) router.replace('/home')
          })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })();
  }, [router])

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  async function onShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Rejoins-moi sur Nous', text: `Voici notre code : ${code}`, url: location.origin + '/register' })
      } else {
        await onCopy()
        alert('Lien et code copiés !')
      }
    } catch {}
  }

  return (
    <main className="w-full max-w-3xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+var(--gap))] pb-[calc(env(safe-area-inset-bottom)+96px)] min-h-screen min-h-[var(--viewport-height)] grid place-items-center">
      <div className="max-w-sm mx-auto text-center">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-6">
          <h1 className="text-xl font-semibold mb-1">En attente de ton/ta partenaire</h1>
          <p className="text-sm opacity-70 mb-4">Partage ce code pour l'inviter</p>

          <div className="mb-4">
            <div className="text-4xl font-bold tracking-[0.35em] tabular-nums select-text">{code || '———'}</div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button onClick={onShare} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60">
              <Share2 className="h-4 w-4" />
              Partager
            </button>
            <a
              href={`sms:?body=${encodeURIComponent(`Rejoins-moi sur Nous ! Crée ton compte ici : ${typeof location !== 'undefined' ? location.origin : ''}/register et utilise le code : ${code}`)}`}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60"
            >
              <span className="text-lg">💬</span>
              SMS
            </a>
            <button onClick={onCopy} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>

          <p className="text-xs opacity-60 mt-4">Dès que votre duo est complet, on t’amène à l’accueil automatiquement.</p>
        </div>
      </div>
    </main>
  )
}
