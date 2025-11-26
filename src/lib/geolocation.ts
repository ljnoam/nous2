export interface Coordinates {
  latitude: number
  longitude: number
}

export async function getCurrentPosition(): Promise<Coordinates | null> {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser.')
    return null
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        console.warn('Error getting location:', error.message)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )
  })
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const position = await getCurrentPosition()
    return position !== null
  } catch {
    return false
  }
}
