import { Skeleton } from "@/components/ui/skeleton"

export default function AppSkeleton() {
  return (
    <div className="relative z-10 min-h-screen pb-20 px-3 pt-[calc(env(safe-area-inset-top)+12px)] space-y-6">
       
       {/* Header Skeleton */}
       <div className="flex items-center justify-center py-2 mb-4 relative">
          <Skeleton className="h-8 w-48 rounded-full" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
             <Skeleton className="h-9 w-9 rounded-full" />
          </div>
       </div>

       {/* Bento Grid Skeleton */}
       <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Main Love Widget (Large) */}
          <Skeleton className="md:col-span-2 md:row-span-2 h-[320px] rounded-3xl" />

          {/* Quick Actions */}
          <div className="md:col-span-1 row-span-1 grid grid-cols-2 gap-3 h-[150px]">
             <Skeleton className="rounded-3xl" />
             <Skeleton className="rounded-3xl" />
          </div>

          {/* Event Widget */}
          <Skeleton className="md:col-span-1 row-span-1 h-[150px] rounded-3xl" />

          {/* Mood Widget */}
          <Skeleton className="md:col-span-3 row-span-1 h-[160px] rounded-3xl" />

          {/* Note Widget */}
          <Skeleton className="md:col-span-3 row-span-1 h-[160px] rounded-3xl" />
       </div>
    </div>
  )
}
