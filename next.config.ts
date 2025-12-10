// next.config.ts (ESM)
import type { NextConfig } from 'next'
import withPWA from 'next-pwa'

const config: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: { optimizeCss: true },
}

// ⚠️ important: disable en dev pour éviter GenerateSW en watch
export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // optionnel mais utile pour éviter d'inclure des artefacts qui perturbent Workbox
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
})(config)
