import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import 'mapbox-gl/dist/mapbox-gl.css'

type LocationResult = {
  place_name: string
  center: [number, number]
}

type Props = {
  onLocationSelect: (result: LocationResult) => void
  accessToken: string
}

export function LocationSearch({ onLocationSelect, accessToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (!accessToken) {
      console.error('Mapbox access token is missing')
      return
    }

    mapboxgl.accessToken = accessToken

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      types: 'country,region,place,locality,neighborhood,address,poi',
      placeholder: 'Rechercher un lieu (ville, pays, monument...)',
      mapboxgl: mapboxgl,
      marker: false,
      language: 'fr',
      limit: 10,
    })

    geocoder.addTo(containerRef.current)

    geocoder.on('result', (e) => {
      if (e.result && e.result.center) {
        onLocationSelect({
          place_name: e.result.place_name,
          center: e.result.center as [number, number],
        })
      }
    })

    // Stylisation directe pour s'assurer que ça s'affiche bien (parfois le CSS Mapbox a besoin d'aide)
    const input = containerRef.current.querySelector('input')
    if (input) {
      input.focus()
    }

    return () => {
      geocoder.onRemove()
    }
  }, [accessToken, onLocationSelect])

  if (!accessToken) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-red-50 text-red-500 rounded-lg text-center">
        Erreur : Clé API Mapbox manquante.
        <br />
        Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div 
        ref={containerRef} 
        className="mapbox-geocoder-wrapper"
        style={{ color: 'black' }} // Force text color for visibility
      />
      <style jsx global>{`
        .mapboxgl-ctrl-geocoder {
          width: 100%;
          max-width: none;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          border-radius: 0.75rem;
          font-family: inherit;
        }
        .mapboxgl-ctrl-geocoder--input {
          height: 48px;
          padding: 12px 40px;
          font-size: 16px;
        }
        .mapboxgl-ctrl-geocoder--icon-search {
          top: 12px;
          left: 12px;
        }
        .mapboxgl-ctrl-geocoder--button {
          top: 12px;
        }
      `}</style>
    </div>
  )
}
