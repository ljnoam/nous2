import InstallBanner from '@/components/pwa/InstallBanner'
import SplashScreen from '@/components/SplashScreen'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import '../styles/globals.css'
import Providers from './providers'

import { Caveat, Indie_Flower, Patrick_Hand, Shadows_Into_Light } from 'next/font/google'

const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' })
const indie = Indie_Flower({ weight: '400', subsets: ['latin'], variable: '--font-indie', display: 'swap' })
const patrick = Patrick_Hand({ weight: '400', subsets: ['latin'], variable: '--font-patrick', display: 'swap' })
const shadows = Shadows_Into_Light({ weight: '400', subsets: ['latin'], variable: '--font-shadows', display: 'swap' })

// Viewport: ensure PWA safe-area and system UI fit
export const viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export const metadata = {
  title: 'Nous',
  description: 'App de couple ❤️',
  manifest: '/manifest.json?v=20251023',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Nous',
    statusBarStyle: 'black-translucent',
  },
}

import OneSignalInit from '@/components/OneSignalInit'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const hdrs = await headers()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      headers: hdrs,
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const hasSession = !!user

  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`
          min-h-screen min-h-[var(--viewport-height)]
          bg-white text-neutral-900
          dark:bg-neutral-950 dark:text-neutral-50
          font-sans antialiased flex flex-col
          ${caveat.variable} ${indie.variable} ${patrick.variable} ${shadows.variable}
        `}
        data-has-session={hasSession ? '1' : '0'}
      >
        <OneSignalInit userId={user?.id} />
        <SplashScreen />
        <InstallBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
