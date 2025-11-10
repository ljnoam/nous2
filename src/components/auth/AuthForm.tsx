'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Mail, Lock, Heart, Eye, EyeOff } from 'lucide-react'

type Mode = 'login' | 'register'

export default function AuthForm({ defaultMode = 'login' as Mode }: { defaultMode?: Mode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/home')
    })
  }, [router])

  const title = useMemo(() => mode === 'login' ? 'Connexion' : 'Créer un compte', [mode])
  const cta = useMemo(() => mode === 'login' ? 'Se connecter' : "S'inscrire", [mode])
  const switchText = useMemo(() => mode === 'login' ? 'Pas de compte ?' : 'Déjà inscrit·e ?', [mode])
  const switchCta = useMemo(() => mode === 'login' ? 'Créer un compte' : 'Se connecter', [mode])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Ask user to verify email then go to login
        router.replace('/login?verify=1')
        return
      }
      router.replace('/onboarding')
    } catch (e: any) {
      setError(e?.message ?? 'Action impossible pour le moment')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20'
  const btnCls = 'w-full rounded-xl bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 font-medium disabled:opacity-60 disabled:cursor-not-allowed'

  return (
  <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {search?.get('verify') && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">Un e‑mail de confirmation vient d'être envoyé. Vérifie ta boîte mail puis connecte‑toi.</div>
        )}
        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-semibold">
          <Heart className="h-6 w-6 text-pink-500" />
          <span>Nous</span>
        </div>

        <div className="relative">
          {/* Floating hearts background under the form */}
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            {/* hearts container */}
            <div className="absolute inset-0">
              <div className="relative w-full h-full">
                <span className="heart heart-1">❤️</span>
                <span className="heart heart-2">💗</span>
                <span className="heart heart-3">💖</span>
                <span className="heart heart-4">❤️</span>
                <span className="heart heart-5">💓</span>
              </div>
            </div>
              <style>{`
                .heart{ position:absolute; font-size:20px; opacity:0.9; transform:translateY(0); }
                .heart-1{ left:8%; top:60%; animation:float1 8s linear infinite; }
                .heart-2{ left:22%; top:75%; animation:float2 7s linear infinite; }
                .heart-3{ left:45%; top:68%; animation:float3 9s linear infinite; }
                .heart-4{ left:70%; top:80%; animation:float1 10s linear infinite; }
                .heart-5{ left:86%; top:62%; animation:float2 8s linear infinite; }
                @keyframes float1 { 0%{ transform:translateY(0) translateX(0) scale(1); opacity:0.9 } 50%{ transform:translateY(-18px) translateX(6px) scale(1.05); opacity:0.95 } 100%{ transform:translateY(0) translateX(0) scale(1); opacity:0.9 } }
                @keyframes float2 { 0%{ transform:translateY(0) translateX(0) scale(0.95); opacity:0.85 } 50%{ transform:translateY(-26px) translateX(-6px) scale(1.06); opacity:0.95 } 100%{ transform:translateY(0) translateX(0) scale(0.95); opacity:0.85 } }
                @keyframes float3 { 0%{ transform:translateY(0) translateX(0) scale(1); opacity:0.9 } 50%{ transform:translateY(-22px) translateX(10px) scale(1.08); opacity:1 } 100%{ transform:translateY(0) translateX(0) scale(1); opacity:0.9 } }
              `}</style>
          </div>

          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-5 sm:p-6 relative z-10">
          <div className="mb-4 text-center">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm opacity-70 mt-1">Accède à ton espace de couple</p>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm opacity-70">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                <input className={`${inputCls} pl-9`} placeholder="toi@example.com" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm opacity-70">Mot de passe</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                <input className={`${inputCls} pl-9 pr-10`} placeholder="••••••••" type={showPassword? 'text' : 'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={(e)=>setPassword(e.target.value)} required />
                <button type="button" onClick={()=>setShowPassword(s=>!s)} aria-label={showPassword? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-300">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button className={btnCls} disabled={loading}>
              {loading ? 'Patiente…' : cta}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="opacity-70 mr-2">{switchText}</span>
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="underline decoration-dotted underline-offset-4"
            >{switchCta}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
