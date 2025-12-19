import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="relative z-10 min-h-screen pb-24 px-3 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+12px)] z-20">
          <Skeleton className="h-16 w-full rounded-2xl bg-white/80 dark:bg-neutral-900/70" />
        </div>

        {/* Buckets Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/5] w-full rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
