import { PDFDocument } from 'pdf-lib'

export interface ProcessPDFResult {
  success: boolean
  blob?: Blob
  error?: string
  note?: string
}

// Each step renders pages at a lower resolution / JPEG quality than the last.
const LEVELS = [
  { scale: 2.0, quality: 0.85 },
  { scale: 1.75, quality: 0.75 },
  { scale: 1.5, quality: 0.65 },
  { scale: 1.25, quality: 0.55 },
  { scale: 1.0, quality: 0.5 },
  { scale: 0.8, quality: 0.4 },
  { scale: 0.6, quality: 0.35 },
]

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
  return pdfjs
}

export async function processPDF(
  file: File,
  targetSize: number,
  onProgress?: (progress: number, message?: string) => void
): Promise<ProcessPDFResult> {
  try {
    const pdfjs = await loadPdfJs()
    const data = new Uint8Array(await file.arrayBuffer())
    const pdf = await pdfjs.getDocument({ data: data.slice() }).promise
    const pageCount = pdf.numPages

    // Pick a starting level from how aggressive the target is.
    const ratio = targetSize / file.size
    let startLevel = 0
    if (ratio < 0.15) startLevel = 3
    else if (ratio < 0.35) startLevel = 2
    else if (ratio < 0.6) startLevel = 1

    const levelsToTry = LEVELS.slice(startLevel)
    let best: Uint8Array | null = null

    for (let l = 0; l < levelsToTry.length; l++) {
      const { scale, quality } = levelsToTry[l]
      const out = await PDFDocument.create()

      for (let p = 1; p <= pageCount; p++) {
        const page = await pdf.getPage(p)
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await page.render({ canvasContext: ctx, viewport }).promise

        const jpg = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode page'))), 'image/jpeg', quality)
        )
        const img = await out.embedJpg(await jpg.arrayBuffer())
        const outPage = out.addPage([base.width, base.height])
        outPage.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height })

        canvas.width = 0
        canvas.height = 0
        page.cleanup()

        const done = (l + (p / pageCount)) / levelsToTry.length
        onProgress?.(Math.min(99, Math.round(done * 100)), `Level ${l + 1}/${levelsToTry.length} - page ${p}/${pageCount}`)
      }

      const bytes = await out.save({ useObjectStreams: true })
      if (!best || bytes.length < best.length) best = bytes
      if (bytes.length <= targetSize) break
    }

    await pdf.destroy()
    onProgress?.(100, 'Done')

    if (!best) throw new Error('Could not process PDF')

    // Already-optimized or text-only PDFs can get bigger when turned into images.
    if (best.length >= file.size) {
      return {
        success: true,
        blob: new Blob([data], { type: 'application/pdf' }),
        note: 'This PDF is already well optimized (mostly text or vector), so it was left unchanged.',
      }
    }

    return {
      success: true,
      blob: new Blob([best], { type: 'application/pdf' }),
      note: best.length > targetSize ? 'Could not reach the exact target, this is the smallest result possible.' : undefined,
    }
  } catch (error) {
    console.error('PDF processing error:', error)
    return {
      success: false,
      error: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
