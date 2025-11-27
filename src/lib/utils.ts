import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Relative time helper (fr) for ActivityWidget and others
export function relativeTimeFromNow(date: string | number | Date): string {
  try {
    const d = new Date(date)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

    const absMs = Math.abs(diffMs)
    const sec = Math.round(diffMs / 1000)
    const min = Math.round(diffMs / (60 * 1000))
    const hr = Math.round(diffMs / (60 * 60 * 1000))
    const day = Math.round(diffMs / (24 * 60 * 60 * 1000))


    if (absMs < 45 * 1000) return rtf.format(sec, 'second')
    if (absMs < 45 * 60 * 1000) return rtf.format(min, 'minute')
    if (absMs < 22 * 60 * 60 * 1000) return rtf.format(hr, 'hour')
    return rtf.format(day, 'day')
  } catch {
    return ''
  }
}

export function getSiteUrl() {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'https://nous2.vercel.app' // Fallback to hardcoded production URL as requested.

  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
  
  // If we are in development, we might want to use localhost, but the user specifically asked 
  // to fix the issue where it redirects to localhost. 
  // However, for local testing of *other* features, localhost might be needed.
  // But for *email links*, they must be public if opened on another device.
  // The user's specific request is "when I click links in email, it sends me to localhost instead of real site".
  // So we prioritize the production URL.
  
  return url
}
