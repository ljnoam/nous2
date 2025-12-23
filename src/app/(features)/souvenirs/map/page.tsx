'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin } from 'lucide-react'

// Ensure Token is set
if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
}

type PhotoLocation = {
  id: string
  url: string
  thumbnail_url: string | null
  latitude: number
  longitude: number
  place_name: string | null
  caption: string | null
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [photos, setPhotos] = useState<PhotoLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<PhotoLocation[] | null>(null)
  const [viewingPhoto, setViewingPhoto] = useState<PhotoLocation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPhotos()
  }, [])

  async function fetchPhotos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: coupleMember } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .maybeSingle()
    
    if (!coupleMember) return

    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('couple_id', coupleMember.couple_id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    
    if (data) {
      setPhotos(data as PhotoLocation[])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!mapContainer.current || loading) return
    if (map.current) return // Initialize only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/nono94/cmjhsxkvp007201qz2th30xbt',
      center: [2.3522, 48.8566], // Default to Paris
      zoom: 1.5,
      projection: 'globe', // Display map as a 3D globe
    })

    // Add navigation controls (Moved to top-right and customized with styles)
     map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }),
        'top-right'
    )
    
    // Add Geolocate control
    map.current.addControl(
        new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        }),
        'top-right'
    )

    map.current.on('style.load', () => {
       // Only run 3D atmosphere logic if projection is globe
       if (map.current) {
          map.current.setFog({
              color: 'rgb(186, 210, 235)', // Lower atmosphere
              'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
              'horizon-blend': 0.02, // Atmosphere thickness (default 0.2 at low zooms)
              'space-color': 'rgb(11, 11, 25)', // Background color
              'star-intensity': 0.6 // Background star brightness (default 0.35 at low zoooms )
          })
       }
    })
  }, [loading])

  // Update markers when photos change
  useEffect(() => {
    if (!map.current || photos.length === 0) return

    // Clear existing markers if any (simple approach: just recreate map or manage markers array - for now we append)
    // A better way is to keep track of markers. For MVP let's just add them.
    
    // Group photos by location (simple clustering by exact coords)
    // For a "perfect" cluster we'd need a library, but let's do a naive "exact match" grouping
    // or just put all markers and let them overlap.
    // Let's iterate and add markers.

    const markers: mapboxgl.Marker[] = []

    photos.forEach(photo => {
      // Create a custom DOM element for the marker
      const el = document.createElement('div')
      el.className = 'marker-custom group'
      el.innerHTML = `
        <div class="relative w-12 h-12 rounded-full border-[3px] border-white shadow-xl overflow-hidden bg-neutral-100 transition-transform transform group-hover:scale-110 group-active:scale-95">
          <img src="${photo.thumbnail_url || photo.url}" class="w-full h-full object-cover" />
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white drop-shadow-sm"></div>
      `

      el.addEventListener('click', () => {
        // Find all photos at this exact location (by place_name or coordinates)
        const locationPhotos = photos.filter(p => 
          p.place_name === photo.place_name || 
          (Math.abs(p.latitude - photo.latitude) < 0.001 && Math.abs(p.longitude - photo.longitude) < 0.001)
        )
        setSelectedLocation(locationPhotos.length > 0 ? locationPhotos : [photo])
        
        // Fly to location
        map.current?.flyTo({
          center: [photo.longitude, photo.latitude],
          zoom: 14,
          essential: true
        })
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([photo.longitude, photo.latitude])
        .addTo(map.current!)
      
      markers.push(marker)
    })

    // Fit bounds to show all markers
    if (photos.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      photos.forEach(p => bounds.extend([p.longitude, p.latitude]))
      map.current.fitBounds(bounds, { padding: 100, maxZoom: 10 })
    }

    return () => {
      markers.forEach(m => m.remove())
    }
  }, [photos, map.current]) // Check map.current dependency

  if (loading) {
    return (
      <main className="px-3 pb-20">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </main>
    )
  }

  return (
    <main className="px-3 pb-20">
      {/* Map Container - takes remaining height with proper spacing */}
      <div 
        className="relative w-full mt-2 rounded-[1.5rem] overflow-hidden border border-black/5 dark:border-white/5 shadow-xl"
        style={{ height: 'calc(100dvh - 180px)' }}
      >
      
      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Selected Photos Drawer / Overlay */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 rounded-t-[2rem] shadow-2xl"
            style={{ maxHeight: '75vh' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-pink-500 flex-shrink-0" />
                  <h3 className="font-bold text-lg truncate">
                    {selectedLocation[0].place_name || 'Lieu inconnu'}
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {selectedLocation.length} photo{selectedLocation.length > 1 ? 's' : ''}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLocation(null)}
                className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Photos Grid - Scrollable with hidden scrollbar */}
            <div className="px-4 pb-8 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(75vh - 100px)' }}>
              <div className="grid grid-cols-3 gap-2">
                {selectedLocation.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => setViewingPhoto(photo)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 active:scale-95 transition-transform"
                  >
                    <Image
                      src={photo.thumbnail_url || photo.url}
                      alt={photo.caption || ''}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Photo Viewer */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={() => setViewingPhoto(null)}
          >
            {/* Close button */}
            <button 
              onClick={() => setViewingPhoto(null)}
              className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition active:scale-95"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            
            {/* Photo */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={viewingPhoto.url}
                alt={viewingPhoto.caption || ''}
                fill
                className="object-contain"
                priority
              />
              
              {/* Caption overlay */}
              {viewingPhoto.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-center">{viewingPhoto.caption}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Empty State Overlay */}
      {photos.length === 0 && (
         <div className="absolute top-4 left-4 right-4 bg-white/90 dark:bg-neutral-800/90 backdrop-blur rounded-xl p-4 shadow-lg z-10 text-center">
            <p className="font-medium">Aucune photo géolocalisée.</p>
            <p className="text-xs text-neutral-500 mt-1">Ajoutez des lieux à vos photos depuis vos albums !</p>
         </div>
      )}
    </div>
    </main>
  )
}
