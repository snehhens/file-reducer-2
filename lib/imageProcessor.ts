interface ProcessImageResult {
  success: boolean
  blob?: Blob
  error?: string
}

export type Encoder = (scale: number, quality: number) => Promise<Blob>

const MIN_QUALITY = 0.45 // below this JPEG/WebP starts to look visibly bad
const MAX_QUALITY = 0.95
const FALLBACK_QUALITY = 0.72 // used while shrinking dimensions

/**
 * Finds the best-looking result that is still <= targetSize.
 * 1. JPEG/WebP: binary-search quality at full resolution (size grows with quality, so this is reliable).
 * 2. Only if even the minimum quality is too big, binary-search the dimensions.
 * 3. PNG ignores quality, so it goes straight to the dimension search.
 * About 6-8 encodes in total (the old version could use up to 50).
 */
export async function findBestEncode(
  encode: Encoder,
  targetSize: number,
  lossy: boolean,
  onProgress?: (p: number) => void
): Promise<{ blob: Blob; hitTarget: boolean }> {
  let steps = 0
  const totalSteps = lossy ? 13 : 8
  const tick = () => onProgress?.(Math.min(99, Math.round((++steps / totalSteps) * 100)))

  let smallest: Blob | null = null
  const track = (b: Blob) => {
    if (!smallest || b.size < smallest.size) smallest = b
    return b
  }

  let quality = FALLBACK_QUALITY

  if (lossy) {
    // Highest quality at full size that fits?
    const top = track(await encode(1, MAX_QUALITY))
    tick()
    if (top.size <= targetSize) return { blob: top, hitTarget: true }

    const floor = track(await encode(1, MIN_QUALITY))
    tick()
    if (floor.size <= targetSize) {
      let lo = MIN_QUALITY
      let hi = MAX_QUALITY
      let best = floor
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2
        const b = track(await encode(1, mid))
        tick()
        if (b.size <= targetSize) {
          best = b
          lo = mid
        } else hi = mid
      }
      return { blob: best, hitTarget: true }
    }
  } else {
    quality = 1
  }

  // Need smaller dimensions as well.
  let lo = 0.05
  let hi = 1
  let best: Blob | null = null
  const rounds = lossy ? 7 : 8
  for (let i = 0; i < rounds; i++) {
    const mid = (lo + hi) / 2
    const b = track(await encode(mid, quality))
    tick()
    if (b.size <= targetSize) {
      best = b
      lo = mid
    } else hi = mid
  }
  if (best) return { blob: best, hitTarget: true }
  return { blob: smallest as unknown as Blob, hitTarget: false }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file) // respects EXIF rotation
    } catch {
      /* fall back below */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('Failed to load image'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function processImage(
  file: File,
  targetSize: number,
  onProgress?: (progress: number) => void
): Promise<ProcessImageResult> {
  try {
    if (!file) return { success: false, error: 'No file provided' }
    if (!file.type.startsWith('image/')) return { success: false, error: 'File is not an image' }
    if (targetSize <= 0) return { success: false, error: 'Invalid target size' }
    if (targetSize >= file.size) {
      return { success: true, blob: new Blob([await file.arrayBuffer()], { type: file.type }) }
    }

    const bmp = await loadBitmap(file)
    const outType = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png'
    const lossy = outType !== 'image/png'

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    const encode: Encoder = (scale, quality) => {
      const w = Math.max(1, Math.round(bmp.width * scale))
      const h = Math.max(1, Math.round(bmp.height * scale))
      canvas.width = w
      canvas.height = h
      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bmp, 0, 0, w, h)
      return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create image'))), outType, quality)
      )
    }

    const { blob } = await findBestEncode(encode, targetSize, lossy, onProgress)
    if ('close' in bmp) bmp.close()
    canvas.width = 0
    canvas.height = 0
    onProgress?.(100)

    if (blob.size >= file.size) {
      return { success: true, blob: new Blob([await file.arrayBuffer()], { type: file.type }) }
    }
    return { success: true, blob }
  } catch (error) {
    console.error('Image processing error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to process image' }
  }
}
