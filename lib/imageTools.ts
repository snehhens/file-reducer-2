import imageCompression from 'browser-image-compression'

export type OutFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function baseName(name: string) {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error(`Could not read ${file.name}`))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Convert and/or resize an image using canvas. `scale` is 0-1, `maxSide` limits the longest side. */
export async function convertImage(
  file: File,
  format: OutFormat,
  quality = 0.9,
  opts: { scale?: number; maxSide?: number } = {}
): Promise<Blob> {
  const bmp = await loadBitmap(file)
  const w0 = bmp.width
  const h0 = bmp.height
  let factor = opts.scale ?? 1
  if (opts.maxSide) factor = Math.min(factor, opts.maxSide / Math.max(w0, h0))
  factor = Math.min(factor, 1)
  const w = Math.max(1, Math.round(w0 * factor))
  const h = Math.max(1, Math.round(h0 * factor))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff' // JPG has no transparency
    ctx.fillRect(0, 0, w, h)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  if ('close' in bmp) bmp.close()

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, format, quality))
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new Error('Failed to encode image')
  return blob
}

/** Quality-based compression used by the bulk tool. */
export async function compressImage(
  file: File,
  opts: { quality: number; maxSide?: number; toWebp?: boolean }
): Promise<Blob> {
  const out = await imageCompression(file, {
    maxSizeMB: 50,
    initialQuality: opts.quality,
    maxWidthOrHeight: opts.maxSide,
    useWebWorker: true,
    fileType: opts.toWebp ? 'image/webp' : undefined,
    alwaysKeepResolution: !opts.maxSide,
  })
  return out
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
