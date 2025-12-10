import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="relative z-10 space-y-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-20 px-4">
      {/* Top Actions Skeleton */}
      <div className="flex items-center justify-end">
        <Skeleton className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* Profile Header Skeleton */}
      <div className="flex flex-col items-center text-center space-y-6 mt-4">
        <Skeleton className="h-32 w-32 rounded-full border-[6px] border-white dark:border-neutral-900 bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-2 flex flex-col items-center">
          <Skeleton className="h-8 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <Skeleton className="h-4 w-32 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>

      {/* Couple Status Card Skeleton */}
      <div className="rounded-3xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-sm p-4 h-32 flex flex-col items-center justify-center space-y-2">
        <Skeleton className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
        <Skeleton className="h-10 w-48 rounded-full bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* Settings Skeleton */}
      <div className="space-y-4 pt-4">
        <Skeleton className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          <Skeleton className="h-12 w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          <Skeleton className="h-12 w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    </main>
  )
}
