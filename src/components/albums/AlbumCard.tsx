import Image from 'next/image'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { memo } from 'react'

type Album = {
  id: string
  title: string
  description: string | null
  is_private: boolean
  cover_photo_url: string | null
  created_at: string
  photo_count?: number
  cover_photos?: Array<{ thumbnail_url: string | null; url: string }>
}

const AlbumCard = memo(function AlbumCard({ album }: { album: Album }) {
  const cover = album.cover_photos?.[0]

  return (
    <Link href={`/albums/${album.id}`} className="group block">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3 shadow-sm border border-black/5 dark:border-white/5">
        {cover ? (
          <Image
            src={cover.thumbnail_url || cover.url}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-20">📷</span>
          </div>
        )}
        {album.is_private && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white rounded-full p-1.5">
            <Lock className="h-3 w-3" />
          </div>
        )}
      </div>
      
      <div className="px-1">
        <h3 className="font-semibold text-[15px] leading-tight truncate text-black dark:text-white">
          {album.title}
        </h3>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
          {album.photo_count || 0} photo{(album.photo_count || 0) > 1 ? 's' : ''}
        </p>
      </div>
    </Link>
  )
})

export default AlbumCard
