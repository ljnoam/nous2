'use client'


import { Button } from '@/components/ui/button'
import { compressImage, createThumbnail } from '@/lib/image-utils'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Trash2, Upload, X, ChevronLeft, Plus, MoreVertical, Pencil, ChevronRight, MapPin } from 'lucide-react'
import { LocationSearch } from '@/components/LocationSearch'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState, type CSSProperties, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"

type Album = {
  id: string
  title: string
  description: string | null
  is_private: boolean
  cover_photo_url: string | null
  created_at: string
}

type Photo = {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  taken_at: string | null
  created_at: string
  latitude: number | null
  longitude: number | null
  place_name: string | null
}

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  
  // Slideshow State
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState(0)
  
  // Edit Title State
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  // Delete Album State
  const [isDeleteDrawerOpen, setIsDeleteDrawerOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Location Search State
  const [showLocationSearch, setShowLocationSearch] = useState(false)
  const [isBatchLocation, setIsBatchLocation] = useState(false)

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

      setCoupleId(status.couple_id)

      // Fetch album
      const { data: albumData } = await supabase
        .from('albums')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('couple_id', status.couple_id)
        .single()

      if (!albumData) {
        router.replace('/souvenirs/albums')
        return
      }

      setAlbum(albumData)
      setEditTitle(albumData.title)

      // Fetch photos
      await fetchPhotos(resolvedParams.id)
    })()
  }, [router, resolvedParams.id])

  async function fetchPhotos(albumId: string) {
    const { data: photosData } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false })

    if (photosData) {
      setPhotos(photosData)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !album || !me || !coupleId) {
      return
    }

    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        await uploadPhoto(file)
      }
      await fetchPhotos(album.id)
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(`Erreur lors de l'upload: ${error?.message || 'Erreur inconnue'}`)
    } finally {
      setUploading(false)
    }
  }

  async function uploadPhoto(file: File) {
    if (!album || !me || !coupleId) {
      throw new Error('Missing required data for upload')
    }

    // Compress image
    const compressed = await compressImage(file)
    const thumbnail = await createThumbnail(file)

    // Upload to storage
    const bucket = album.is_private ? 'couple-photos-private' : 'couple-photos'
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    const path = `${coupleId}/${album.id}/${filename}.jpg`
    const thumbPath = `${coupleId}/${album.id}/${filename}_thumb.jpg`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, compressed)

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    await supabase.storage.from(bucket).upload(thumbPath, thumbnail)

    // Get public URLs
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    const { data: thumbUrlData } = supabase.storage.from(bucket).getPublicUrl(thumbPath)

    // Save to database
    const { uploadPhoto: savePhoto } = await import('@/lib/actions')
    await savePhoto({
      album_id: album.id,
      couple_id: coupleId,
      url: urlData.publicUrl,
      thumbnail_url: thumbUrlData.publicUrl,
      taken_at: null, // Removed EXIF extraction for now as per request to remove geolocation/EXIF logic
    })
  }

  async function deletePhoto(photo: Photo) {
    if (!confirm('Supprimer cette photo ?')) return

    const bucket = album?.is_private ? 'couple-photos-private' : 'couple-photos'
    const pathMatch = photo.url.match(/\/([^\/]+\/[^\/]+\/[^\/]+\.(jpg|jpeg|png))/)

    if (pathMatch) {
      const path = pathMatch[1]
      await supabase.storage.from(bucket).remove([path])
      const thumbPath = path.replace('.jpg', '_thumb.jpg')
      await supabase.storage.from(bucket).remove([thumbPath])
    }

    await supabase.from('photos').delete().eq('id', photo.id)
    await fetchPhotos(album!.id)
  }

  async function handleTitleSave() {
    if (!album || !editTitle.trim()) {
      setIsEditingTitle(false)
      setEditTitle(album?.title || '')
      return
    }

    if (editTitle.trim() === album.title) {
      setIsEditingTitle(false)
      return
    }

    const { error } = await supabase
      .from('albums')
      .update({ title: editTitle.trim() })
      .eq('id', album.id)

    if (error) {
      alert('Erreur lors de la modification du titre')
    } else {
      setAlbum({ ...album, title: editTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  async function handleDeleteAlbum() {
    if (!album) return
    setIsDeleting(true)
    
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', album.id)

    setIsDeleting(false)
    setIsDeleteDrawerOpen(false)

    if (error) {
      alert('Erreur lors de la suppression')
    } else {
      router.replace('/souvenirs/albums')
    }
  }

  // Slideshow Logic
  const handleNext = useCallback(() => {
    if (selectedIndex === null) return
    setDirection(1)
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % photos.length))
  }, [selectedIndex, photos.length])

  const handlePrev = useCallback(() => {
    if (selectedIndex === null) return
    setDirection(-1)
    setSelectedIndex((prev) => (prev === null ? null : (prev - 1 + photos.length) % photos.length))
  }, [selectedIndex, photos.length])


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return
      if (showLocationSearch) {
        if (e.key === 'Escape') setShowLocationSearch(false)
        return
      }
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'Escape') setSelectedIndex(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, handleNext, handlePrev, showLocationSearch])

  const handleLocationSelect = async (result: { place_name: string, center: [number, number] }) => {
    console.log('Location selected:', result)
    const { center, place_name } = result
    const [longitude, latitude] = center

    if (isBatchLocation && album) {
      if (!confirm(`Appliquer "${place_name}" à toutes les photos de cet album ?`)) return

      // Update in DB
      const { error } = await supabase
        .from('photos')
        .update({ 
          latitude, 
          longitude, 
          place_name 
        })
        .eq('album_id', album.id)

      if (error) {
        console.error('Error updating batch location:', error)
        alert('Erreur lors de la mise à jour des localisations')
        return
      }

      // Update local state
      setPhotos(photos.map(p => ({ ...p, latitude, longitude, place_name })))
      alert('Localisation appliquée à toutes les photos !')
    } 
    else if (selectedPhoto) {
      // Update SINGLE photo
      const { error } = await supabase
        .from('photos')
        .update({ 
          latitude, 
          longitude, 
          place_name 
        })
        .eq('id', selectedPhoto.id)

      if (error) {
        console.error('Error updating photo location:', error)
        alert('Erreur lors de la mise à jour de la localisation')
        return
      }

      // Update local state
      setPhotos(photos.map(p => p.id === selectedPhoto.id ? { ...p, latitude, longitude, place_name } : p))
    }

    setShowLocationSearch(false)
    setIsBatchLocation(false)
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  }

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null

  if (!album) {
    return (
      <>

        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <p>Chargement...</p>
        </div>
      </>
    )
  }

  const containerStyle: CSSProperties = {
    "--gap": "16px",
  } as any;

  return (
    <>

      
      <main 
        style={containerStyle}
        className="relative z-10 min-h-screen pb-28 pt-[calc(env(safe-area-inset-top)+var(--gap))]"
      >
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Floating Header */}
          <div className="sticky top-[calc(env(safe-area-inset-top)+var(--gap))] z-20 mb-6">
            <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-3">
              <Link href="/souvenirs/albums" className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              
              <div className="text-center flex-1 px-2 min-w-0">
                {isEditingTitle ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    className="w-full bg-transparent text-center font-bold outline-none border-b border-blue-500"
                  />
                ) : (
                  <h1 
                    onClick={() => setIsEditingTitle(true)}
                    className="font-bold truncate cursor-text active:opacity-50"
                  >
                    {album.title}
                  </h1>
                )}
                {album.description && !isEditingTitle && (
                  <p className="text-xs opacity-60 truncate">{album.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsDeleteDrawerOpen(true)}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 active:scale-95 transition"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <label className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition cursor-pointer text-blue-600 dark:text-blue-400">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </label>
                <button 
                  onClick={() => {
                    setIsBatchLocation(true)
                    setShowLocationSearch(true)
                  }}
                  className="p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition"
                  title="Ajouter un lieu à tout l'album"
                >
                  <MapPin className="h-5 w-5" />
                </button>
            </div>
            </div>
          </div>

          {/* Photos Grid */}
          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 px-4 text-center">
              <div className="text-4xl mb-4">📷</div>
              <p className="text-lg font-medium">Aucune photo</p>
              <p className="text-sm mt-1">Appuie sur "Ajouter" pour commencer</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5 sm:gap-1">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 cursor-pointer overflow-hidden"
                  onClick={() => setSelectedIndex(index)}
                >
                  <Image
                    src={photo.thumbnail_url || photo.url}
                    alt={photo.caption || ''}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                  />
                  
                  {/* Location Overlay */}
                  {photo.place_name && (
                    <div className="absolute inset-x-0 bottom-0 pt-8 pb-1.5 px-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                        <div className="flex items-center gap-1 text-white">
                            <MapPin className="w-3 h-3 flex-shrink-0 drop-shadow-md" fill="currentColor" />
                            <span className="text-[10px] sm:text-[11px] font-medium truncate drop-shadow-md leading-none">
                                {photo.place_name.split(',')[0]}
                            </span>
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center"
              onClick={() => setSelectedIndex(null)}
            >
              <button
                onClick={() => setSelectedIndex(null)}
                className="absolute top-4 right-4 z-50 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 backdrop-blur-md"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="relative w-full h-full flex items-center justify-center p-4 pb-32 overflow-hidden">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.img
                    key={selectedPhoto.id}
                    src={selectedPhoto.url}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(e, { offset }) => {
                      const swipe = offset.x
                      if (swipe < -50) {
                        handleNext()
                      } else if (swipe > 50) {
                        handlePrev()
                      }
                    }}
                    className="absolute max-w-full max-h-[calc(100vh-200px)] object-contain cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
                  />
                </AnimatePresence>
              </div>





              {/* Floating Controls */}
              <div 
                className="absolute bottom-32 left-0 right-0 flex items-center justify-center gap-4 z-50 pointer-events-none"
              >
                {/* Navigation Arrows */}
                <div 
                  className="flex items-center gap-6 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={handlePrev}
                    className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition text-white"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <div className="w-px h-4 bg-white/20" />
                  <button 
                    onClick={handleNext}
                    className="p-2 rounded-full hover:bg-white/10 active:scale-90 transition text-white"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>

                {/* Create Location Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsBatchLocation(false)
                    setShowLocationSearch(true)
                  }}
                  className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full p-3 shadow-2xl pointer-events-auto text-blue-400 hover:bg-white/10 active:scale-90 transition flex items-center justify-center h-[58px] w-[58px]"
                  title="Ajouter un lieu"
                >
                  <MapPin className="h-6 w-6" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePhoto(selectedPhoto)
                    setSelectedIndex(null)
                  }}
                  className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-full p-3 shadow-2xl pointer-events-auto text-red-500 hover:bg-white/10 active:scale-90 transition flex items-center justify-center h-[58px] w-[58px]"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Location Search Overlay - MOVED HERE and updated to fixed/z-[150] to cover everything including lightbox */}
        {showLocationSearch && (
          <div 
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              e.stopPropagation()
              if (!isBatchLocation) { 
                 // If not batch, we might be in lightbox, so maybe just close search
                 setShowLocationSearch(false)
              } else {
                 setShowLocationSearch(false)
                 setIsBatchLocation(false)
              }
            }}
          >
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-black">
                  {isBatchLocation ? "Lieu pour l'album" : "Lieu pour cette photo"}
                </h3>
                <button 
                  onClick={() => {
                      setShowLocationSearch(false)
                      if(isBatchLocation) setIsBatchLocation(false)
                  }}
                  className="p-1 rounded-full hover:bg-neutral-100 text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <LocationSearch 
                accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''} 
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </div>
        )}

        {/* Delete Album Drawer */}
        <Drawer open={isDeleteDrawerOpen} onOpenChange={setIsDeleteDrawerOpen}>
          <DrawerContent className="bg-white dark:bg-neutral-900">
            <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <DrawerTitle>Supprimer l'album ?</DrawerTitle>
                <DrawerDescription>
                  Cette action est irréversible. Toutes les photos de cet album seront supprimées.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAlbum}
                  disabled={isDeleting}
                  className="w-full rounded-xl h-12 text-base bg-red-500 hover:bg-red-600 text-white"
                >
                  {isDeleting ? 'Suppression...' : "Supprimer l'album"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full rounded-xl h-12 text-base">Annuler</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </main>
    </>
  )
}
