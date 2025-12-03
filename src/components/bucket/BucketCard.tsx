import { Bucket } from '@/lib/types'
import { Link } from 'lucide-react' // Wait, Link is from next/link usually. Lucide has Link icon.
import NextLink from 'next/link'
import { CheckSquare, ListTodo } from 'lucide-react'

interface BucketCardProps {
  bucket: Bucket
  itemCount?: number
}

export default function BucketCard({ bucket, itemCount = 0 }: BucketCardProps) {
  return (
    <NextLink href={`/bucket/${bucket.id}`} className="group block">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-center transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md">
        <div className="absolute top-3 right-3 bg-white/80 dark:bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 border border-black/5 dark:border-white/5 z-10">
          {itemCount} items
        </div>

        <div className="text-center p-4 w-full">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
            {bucket.icon ? (
              <span className="text-2xl">{bucket.icon}</span>
            ) : (
              <ListTodo className="h-6 w-6" />
            )}
          </div>
          <h3 className="font-semibold text-lg text-black dark:text-white line-clamp-2 px-2">
            {bucket.title}
          </h3>
          {bucket.description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 px-4">
              {bucket.description}
            </p>
          )}
        </div>
      </div>
    </NextLink>
  )
}
