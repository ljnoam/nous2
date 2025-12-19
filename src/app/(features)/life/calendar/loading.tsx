import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="relative z-10 flex w-full flex-col min-h-screen pb-24 px-3 pt-[calc(env(safe-area-inset-top)+12px)]">
      {/* Header Skeleton */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+12px)] z-20 mb-4">
        <Skeleton className="h-16 w-full rounded-2xl bg-white/80 dark:bg-neutral-900/70" />
      </div>

      {/* Events List Skeleton */}
      <div className="space-y-4 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 p-4 space-y-3">
            <Skeleton className="h-3 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <Skeleton className="h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
