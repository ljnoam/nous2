"use client"

import BlurText from "@/components/ui/BlurText"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { Eye, EyeOff, Heart, Lock, Mail } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"

type Mode = "login" | "register" | "forgot-password"

type HeartSpec = {
  id: number
  left: number
  top: number
  scale: number
  animationDuration: number
  animationDelay: number
  swayDuration: number
  swayDelay: number
}

const SAFE_ZONE = { xMin: 30, xMax: 70, yMin: 10, yMax: 50 }

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min

// Check if a point is inside the "safe zone" (where the title usually is)
const isInSafeZone = (x: number, y: number) =>
  x >= SAFE_ZONE.xMin && x <= SAFE_ZONE.xMax && y >= SAFE_ZONE.yMin && y <= SAFE_ZONE.yMax

function generateHeart(id: number): HeartSpec {
  let left, top
  let attempts = 0

  // Try to find a position outside the safe zone
  do {
    left = randomBetween(2, 98)
    top = randomBetween(2, 98)
    attempts++
  } while (isInSafeZone(left, top) && attempts < 50)

  // If we couldn't find a safe spot in 50 tries, just place it anywhere but bias towards bottom
  if (isInSafeZone(left, top)) {
    top = randomBetween(50, 98)
  }

  return {
    id,
    left,
    top,
    scale: randomBetween(0.6, 1.2), // Varied sizes
    animationDuration: randomBetween(15, 25), // Slow float upwards
    animationDelay: randomBetween(0, 15) * -1, // Start at different times in the cycle
    swayDuration: randomBetween(3, 6), // Sway side to side
    swayDelay: randomBetween(0, 5),
  }
}

function makeHeartCloud(count: number): HeartSpec[] {
  return Array.from({ length: count }, (_, i) => generateHeart(i))
}

export default function AuthForm({ defaultMode = "login" as Mode }: { defaultMode?: Mode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/home")
    })
  }, [router])

  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const title = useMemo(() => {
    if (mode === "login") return "Connexion"
    if (mode === "register") return "Créer un compte"
    return "Mot de passe oublié"
  }, [mode])

  const cta = useMemo(() => {
    if (mode === "login") return "Se connecter"
    if (mode === "register") return "S'inscrire"
    return "Envoyer le lien"
  }, [mode])

  const switchText = useMemo(() => (mode === "login" ? "Pas de compte ?" : "Déjà inscrit·e ?"), [mode])
  const switchCta = useMemo(() => (mode === "login" ? "Créer un compte" : "Se connecter"), [mode])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/update-password`,
        })
        if (error) throw error
        setSuccessMsg("Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.")
        setLoading(false)
        return
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/login?confirmed=true`,
          },
        })
        if (error) throw error
        router.replace("/login?verify=1")
        return
      }
      router.replace("/onboarding")
    } catch (e: any) {
      setError(e?.message ?? "Action impossible pour le moment")
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    "w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 transition-all"

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 relative overflow-hidden">
      <HeartsBackground />

      <div className="w-full max-w-sm relative z-10">
        {search?.get("verify") && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Un e-mail de confirmation vient d'être envoyé. Vérifie ta boîte mail puis connecte-toi.
          </div>
        )}
        {search?.get("confirmed") && (
          <div className="mb-3 rounded-xl border border-green-300 bg-green-50 dark:border-green-900/40 dark:bg-green-900/30 px-3 py-2 text-sm text-green-800 dark:text-green-200">
            Ton compte a été confirmé avec succès ! Tu peux maintenant te connecter.
          </div>
        )}
        {search?.get("email_updated") && (
          <div className="mb-3 rounded-xl border border-green-300 bg-green-50 dark:border-green-900/40 dark:bg-green-900/30 px-3 py-2 text-sm text-green-800 dark:text-green-200">
            Ton email a bien été changé. Connecte-toi avec ta nouvelle adresse.
          </div>
        )}
        {search?.get("password_updated") && (
          <div className="mb-3 rounded-xl border border-green-300 bg-green-50 dark:border-green-900/40 dark:bg-green-900/30 px-3 py-2 text-sm text-green-800 dark:text-green-200">
            Ton mot de passe a bien été changé. Connecte-toi avec ton nouveau mot de passe.
          </div>
        )}
        {successMsg && (
          <div className="mb-3 rounded-xl border border-green-300 bg-green-50 dark:border-green-900/40 dark:bg-green-900/30 px-3 py-2 text-sm text-green-800 dark:text-green-200">
            {successMsg}
          </div>
        )}

        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-semibold">
          <Heart className="h-6 w-6 text-pink-500" />
          <BlurText
            text="Nous"
            className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white"
            delay={150}
            animateBy="chars"
            direction="bottom"
          />
        </div>

        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-6 sm:p-8 relative z-10">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm opacity-70 mt-1">
              {mode === 'forgot-password' ? 'Entre ton email pour réinitialiser' : 'Accède à ton espace de couple'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1.5">
              <span className="block text-sm font-medium opacity-70 ml-1">Email</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                <input
                  className={`${inputCls} pl-10`}
                  placeholder="toi@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            {mode !== 'forgot-password' && (
              <label className="block space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <span className="block text-sm font-medium opacity-70">Mot de passe</span>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-xs opacity-60 hover:opacity-100 hover:text-pink-500 transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                  <input
                    className={`${inputCls} pl-10 pr-10`}
                    placeholder="********"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            )}

            <Button className="w-full mt-2" disabled={loading} size="lg">
              {loading ? "Patiente..." : cta}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            {mode === 'forgot-password' ? (
              <button
                onClick={() => setMode('login')}
                className="font-medium hover:text-pink-500 transition-colors"
              >
                Retour à la connexion
              </button>
            ) : (
              <>
                <span className="opacity-70 mr-2">{switchText}</span>
                <button
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="font-medium underline decoration-dotted underline-offset-4 hover:text-pink-500 transition-colors"
                >
                  {switchCta}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeartsBackground() {
  const [hearts, setHearts] = useState<HeartSpec[]>([])

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches) return

    const width = window.innerWidth
    // More hearts for larger screens, fewer for mobile to save battery/perf
    const count = width < 480 ? 15 : width < 1024 ? 30 : 50

    setHearts(makeHeartCloud(count))
  }, [])

  if (hearts.length === 0) return null

  return (
    <div className="hearts-container" aria-hidden="true">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="heart-wrapper"
          style={{
            left: `${heart.left}%`,
            top: `${heart.top}%`,
            width: `calc(30px * ${heart.scale})`,
            height: `calc(30px * ${heart.scale})`,
            "--float-duration": `${heart.animationDuration}s`,
            "--float-delay": `${heart.animationDelay}s`,
            "--sway-duration": `${heart.swayDuration}s`,
            "--sway-delay": `${heart.swayDelay}s`,
          } as React.CSSProperties}
        >
          <div className="heart-sway">
            <div className="heart" />
          </div>
        </div>
      ))}

      <style jsx>{`
        .hearts-container {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .heart-wrapper {
          position: absolute;
          /* Center the wrapper on its coordinate */
          transform: translate(-50%, -50%);
          /* Apply the float animation to the wrapper */
          animation: floatUp var(--float-duration) linear infinite;
          animation-delay: var(--float-delay);
          will-change: transform;
        }

        .heart-sway {
          width: 100%;
          height: 100%;
          animation: sway var(--sway-duration) ease-in-out infinite alternate;
          animation-delay: var(--sway-delay);
          will-change: transform;
        }

        .heart {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--pinklove, #ff3b81) 0%, #f20044 100%);
          opacity: 0.6;
          border-radius: 10%; /* Slightly rounded square base */
          position: relative;
          /* Apply pulse to the inner element */
          animation: pulse 3s ease-in-out infinite;
          box-shadow: 0 0 10px rgba(255, 59, 129, 0.2);
        }

        .heart::before,
        .heart::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: inherit;
          border-radius: 50%;
        }
        .heart::before { top: -50%; left: 0; }
        .heart::after { right: -50%; top: 0; }

        @keyframes floatUp {
          0% {
            transform: translate(-50%, -50%) translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) translateY(-120vh);
            opacity: 0;
          }
        }

        @keyframes sway {
          0% { transform: rotate(-55deg); }
          100% { transform: rotate(-35deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .heart-wrapper, .heart-sway, .heart {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
