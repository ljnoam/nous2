import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="relative z-10 min-h-screen pb-20 px-3 pt-[calc(env(safe-area-inset-top)+12px)] space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col items-center space-y-1">
        <Skeleton className="h-10 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* Bento Grid Skeleton */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(140px,auto)]">
        {/* Love Widget Skeleton */}
        <div className="md:col-span-2 md:row-span-2 min-h-[150px]">
          <Skeleton className="h-full w-full rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Quick Actions Skeleton */}
        <div className="md:col-span-1 row-span-1">
          <Skeleton className="h-[140px] w-full rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Event Widget Skeleton */}
        <div className="md:col-span-1 row-span-1 min-h-[140px]">
          <Skeleton className="h-full w-full rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Note Widget Skeleton */}
        <div className="md:col-span-3 row-span-1 min-h-[160px]">
          <Skeleton className="h-full w-full rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    </main>
  )
}
