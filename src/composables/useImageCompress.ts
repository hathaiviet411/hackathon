export async function compressCanvas(
  canvas: HTMLCanvasElement,
  maxWidthOrHeight = 1920,
  quality = 0.8,
): Promise<{ blob: Blob; base64: string; width: number; height: number; sizeKB: number }> {
  const { default: imageCompression } = await import('browser-image-compression')

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      async (b) => {
        if (!b) {
          reject(new Error('Failed to create blob'))
          return
        }
        try {
          const file = new File([b], 'capture.jpg', { type: 'image/jpeg' })
          const compressed = await imageCompression(file, {
            maxWidthOrHeight,
            useWebWorker: true,
            initialQuality: quality,
            fileType: 'image/jpeg',
          })
          resolve(compressed)
        } catch {
          resolve(b)
        }
      },
      'image/jpeg',
      quality,
    )
  })

  const base64 = await blobToBase64(blob)
  const bitmap = await createImageBitmap(blob)

  return {
    blob,
    base64,
    width: bitmap.width,
    height: bitmap.height,
    sizeKB: Math.round((blob.size / 1024) * 10) / 10,
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function cropCanvas(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height)
  return canvas
}
