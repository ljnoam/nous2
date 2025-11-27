'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff } from 'lucide-react'
import BlurText from '@/components/ui/BlurText'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if we have a session (which happens after clicking the reset link)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // If no session, maybe the link is invalid or expired
        setError("Lien invalide ou expiré. Demande une nouvelle réinitialisation.")
      }
    })
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères")
      return
    }
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.replace('/login?password_updated=true')
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 transition-all"

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 relative overflow-hidden">
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-semibold">
          <BlurText
            text="Nouveau mot de passe"
            className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white"
            delay={150}
            animateBy="chars"
            direction="bottom"
          />
        </div>

        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-6 sm:p-8 relative z-10">
          
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1.5">
              <span className="block text-sm font-medium opacity-70 ml-1">Choisis ton nouveau mot de passe</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                <input
                  className={`${inputCls} pl-10 pr-10`}
                  placeholder="********"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button 
              className="w-full mt-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black px-4 py-3 font-medium shadow hover:opacity-90 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Mise à jour..." : "Enregistrer le mot de passe"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
