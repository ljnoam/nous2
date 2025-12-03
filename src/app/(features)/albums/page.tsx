'use client'

import HeartBackground from '@/components/home/HeartBackground'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Lock, Plus, Unlock, ChevronRight, Images, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type CSSProperties } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Switch } from "@/components/ui/switch"

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

export default function AlbumsPage() {
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [showPrivate, setShowPrivate] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        router.replace('/register')
        return
      }
      setMe(s.session.user.id)

      const { data: status } = await supabase
        .from('my_couple_status')
        .select('*')
        .eq('user_id', s.session.user.id)
        .maybeSingle()

      if (!status) {
        router.replace('/onboarding')
        return
      }

      if (status.members_count < 2) {
        router.replace('/waiting')
        return
      }

      setCoupleId(status.couple_id)

      // Fetch albums
      await fetchAlbums(status.couple_id)
    })()
  }, [router])

  async function fetchAlbums(cid: string) {
    const { data: albumsData } = await supabase
      .from('albums')
      .select('*')
      .eq('couple_id', cid)
      .order('created_at', { ascending: false })

    if (albumsData) {
      // Get count and first 4 photos for each album
      const albumsWithData = await Promise.all(
        albumsData.map(async (album) => {
          const { count } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', album.id)

          // Get first 1 photo for cover
          const { data: coverPhotos } = await supabase
            .from('photos')
            .select('thumbnail_url, url')
            .eq('album_id', album.id)
            .order('created_at', { ascending: false })
            .limit(1)

          return {
            ...album,
            photo_count: count || 0,
            cover_photos: coverPhotos || []
          }
        })
      )
      setAlbums(albumsWithData)
    }
  }

  const normalAlbums = albums.filter(a => !a.is_private)
  const privateAlbums = albums.filter(a => a.is_private)

  const containerStyle: CSSProperties = {
    "--gap": "12px",
  } as any;

  return (
    <>
      <HeartBackground />
      
      <main 
        style={containerStyle}
        className="relative z-10 min-h-screen pb-24 px-3 pt-[calc(env(safe-area-inset-top)+var(--gap))]"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Floating Header */}
          <div className="sticky top-[calc(env(safe-area-inset-top)+var(--gap))] z-20">
            <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-xl text-pink-600 dark:text-pink-400">
                  <Images className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Albums</h1>
              </div>
              
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Normal Albums */}
          <section>
            {normalAlbums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <div className="text-4xl mb-2">📷</div>
                <p>Aucun album</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                {normalAlbums.map(album => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            )}
          </section>

          {/* Private Albums Section */}
          <section className="pt-4">
            <div 
              onClick={() => setShowPrivate(!showPrivate)}
              className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/50 dark:bg-neutral-900/50 p-4 flex items-center justify-between cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Lock className="h-5 w-5 opacity-50" />
                </div>
                <span className="font-medium">Albums Masqués</span>
              </div>
              {showPrivate ? (
                <ChevronUp className="h-5 w-5 opacity-30" />
              ) : (
                <ChevronDown className="h-5 w-5 opacity-30" />
              )}
            </div>

            {showPrivate && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                {privateAlbums.length === 0 ? (
                  <div className="py-8 text-center opacity-50 text-sm">
                    Aucun album privé
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                    {privateAlbums.map(album => (
                      <AlbumCard key={album.id} album={album} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Create Album Drawer */}
        {coupleId && me && (
          <CreateAlbumDrawer
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            coupleId={coupleId}
            userId={me}
            onSuccess={() => {
              setIsDrawerOpen(false)
              if (coupleId) fetchAlbums(coupleId)
            }}
          />
        )}
      </main>
    </>
  )
}

function AlbumCard({ album }: { album: Album }) {
  const cover = album.cover_photos?.[0]

  return (
    <Link href={`/albums/${album.id}`} className="group block">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3 shadow-sm border border-black/5 dark:border-white/5">
        {cover ? (
          <img
            src={cover.thumbnail_url || cover.url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
}

function CreateAlbumDrawer({
  open,
  onOpenChange,
  coupleId,
  userId,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  coupleId: string
  userId: string
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!title.trim()) return

    setLoading(true)
    const { error } = await supabase.from('albums').insert({
      couple_id: coupleId,
      title: title.trim(),
      description: description.trim() || null,
      is_private: isPrivate,
      created_by: userId
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setTitle('')
    setDescription('')
    setIsPrivate(false)
    onSuccess()
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white dark:bg-neutral-900">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Nouvel Album</DrawerTitle>
            <DrawerDescription>Crée un nouvel album pour tes souvenirs.</DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 space-y-4">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de l'album"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                autoFocus
              />
            </div>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optionnel)"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-neutral-500" />
                <span className="font-medium">Album Privé</span>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
          </div>

          <DrawerFooter>
            <Button 
              onClick={handleCreate} 
              disabled={!title.trim() || loading}
              className="w-full rounded-xl h-12 text-base"
            >
              {loading ? 'Création...' : 'Créer l\'album'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full rounded-xl h-12 text-base">Annuler</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
