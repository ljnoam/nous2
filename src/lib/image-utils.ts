import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }

  try {
    const compressedFile = await imageCompression(file, options)
    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)
    return file
  }
}

export async function createThumbnail(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 400,
    useWebWorker: true
  }

  try {
    const thumbnail = await imageCompression(file, options)
    return thumbnail
  } catch (error) {
    console.error('Error creating thumbnail:', error)
    return file
  }
}
