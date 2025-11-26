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
