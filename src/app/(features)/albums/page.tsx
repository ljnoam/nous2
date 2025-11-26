'use client'

import HeartBackground from '@/components/home/HeartBackground'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Lock, Map as MapIcon, Plus, Unlock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)

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

          // Get first 4 photos for cover grid
          const { data: coverPhotos } = await supabase
            .from('photos')
            .select('thumbnail_url, url')
            .eq('album_id', album.id)
            .order('created_at', { ascending: false })
            .limit(4)

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

  return (
    <>
      <HeartBackground />
      <main className="relative z-10 min-h-screen pt-8 pb-28 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Albums Photo 📸</h1>
              <p className="text-sm opacity-70 mt-1">
                {albums.length} album{albums.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setView(view === 'grid' ? 'map' : 'grid')}
                variant="outline"
                className="rounded-2xl"
              >
                <MapIcon className="h-4 w-4 mr-2" />
                {view === 'grid' ? 'Carte' : 'Grille'}
              </Button>

              <Button
                onClick={() => setShowCreateModal(true)}
                className="rounded-2xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvel album
              </Button>
            </div>
          </div>

          {view === 'grid' ? (
            <>
              {/* Normal Albums */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Albums</h2>
                {normalAlbums.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-8 text-center">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="opacity-70">Aucun album pour le moment</p>
                    <p className="text-sm opacity-60 mt-1">Crée ton premier album pour commencer !</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {normalAlbums.map(album => (
                      <AlbumCard key={album.id} album={album} />
                    ))}
                  </div>
                )}
              </section>

              {/* Private Albums */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Albums Privés
                  </h2>
                  <Button
                    onClick={() => setShowPrivate(!showPrivate)}
                    variant="ghost"
                    size="sm"
                    className="rounded-2xl"
                  >
                    {showPrivate ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    {showPrivate ? 'Masquer' : 'Afficher'}
                  </Button>
                </div>

                {showPrivate ? (
                  privateAlbums.length === 0 ? (
                    <div className="rounded-2xl border border-pink-200/20 dark:border-pink-800/20 bg-pink-50/50 dark:bg-pink-900/20 backdrop-blur-md p-6 text-center">
                      <p className="opacity-70">Aucun album privé</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {privateAlbums.map(album => (
                        <AlbumCard key={album.id} album={album} />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-pink-200/20 dark:border-pink-800/20 bg-pink-50/50 dark:bg-pink-900/20 backdrop-blur-md p-6 text-center">
                    <Lock className="h-8 w-8 mx-auto opacity-50 mb-2" />
                    <p className="text-sm opacity-70">Clique sur "Afficher" pour voir les albums privés</p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-8 text-center">
              <MapIcon className="h-12 w-12 mx-auto opacity-50 mb-4" />
              <p className="text-lg font-semibold">Vue Carte</p>
              <p className="text-sm opacity-70 mt-2">La carte interactive arrive bientôt...</p>
            </div>
          )}
        </div>

        {/* Create Album Modal */}
        {showCreateModal && coupleId && me && (
          <CreateAlbumModal
            coupleId={coupleId}
            userId={me}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              if (coupleId) fetchAlbums(coupleId)
            }}
          />
        )}
      </main>
    </>
  )
}

function AlbumCard({ album }: { album: Album }) {
  const coverPhotos = album.cover_photos || []

  return (
    <Link href={`/albums/${album.id}`}>
      <div className="group relative rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md overflow-hidden hover:scale-[1.02] transition-transform shadow-lg">
        {/* Cover Photo Grid (2x2) */}
        <div className="aspect-square bg-gradient-to-br from-pink-100 to-rose-200 dark:from-pink-900/30 dark:to-rose-800/30 relative">
          {coverPhotos.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full h-full">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="relative bg-neutral-200 dark:bg-neutral-800">
                  {coverPhotos[index] ? (
                    <img
                      src={coverPhotos[index].thumbnail_url || coverPhotos[index].url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">
                      📷
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-50">
             📷
            </div>
          )}

          {album.is_private && (
            <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-2">
              <Lock className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-1">{album.title}</h3>
          {album.description && (
            <p className="text-sm opacity-70 line-clamp-2 mt-1">{album.description}</p>
          )}
          <p className="text-xs opacity-60 mt-2">
            {album.photo_count || 0} photo{(album.photo_count || 0) > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}

function CreateAlbumModal({
  coupleId,
  userId,
  onClose,
  onSuccess
}: {
  coupleId: string
  userId: string
  onClose: () => void
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

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">Créer un album</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vacances 2024"
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nos meilleurs moments..."
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              rows={3}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded"
            />
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-pink-500" />
              <span className="text-sm">Album privé (protégé par code PIN)</span>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose} variant="outline" className="rounded-2xl">
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || loading}
            className="rounded-2xl"
          >
            {loading ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
