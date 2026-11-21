'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Download, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { baseName, downloadBlob } from '@/lib/imageTools'

const SWATCHES = [
  { label: 'Transparent', value: null },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
]

const checker = {
  backgroundImage:
    'linear-gradient(45deg,#ddd 25%,transparent 25%),linear-gradient(-45deg,#ddd 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ddd 75%),linear-gradient(-45deg,transparent 75%,#ddd 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
}

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [cutout, setCutout] = useState<Blob | null>(null)
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null)
  const [bg, setBg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const urls = useRef<string[]>([])

  const track = (blob: Blob | File) => {
    const u = URL.createObjectURL(blob)
    urls.current.push(u)
    return u
  }
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), [])

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted[0]) return
    setFile(accepted[0])
    setOriginalUrl(track(accepted[0]))
    setCutout(null)
    setCutoutUrl(null)
    setError(null)
    setProgress(0)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
  })

  const remove = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setProgress(0)
    setStage('Loading AI model (first time only)...')
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const result = await removeBackground(file, {
        output: { format: 'image/png' },
        progress: (key: string, current: number, total: number) => {
          if (total > 0) setProgress(Math.round((current / total) * 100))
          setStage(key.startsWith('fetch') ? 'Downloading AI model (first time only)...' : 'Removing background...')
        },
      })
      setCutout(result)
      setCutoutUrl(track(result))
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Background removal failed. Try a different image.')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    if (!cutout || !file) return
    const name = `${baseName(file.name)}_no-bg.png`
    if (!bg) return downloadBlob(cutout, name)
    const img = new Image()
    img.src = cutoutUrl!
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')!
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0)
    c.toBlob((b) => b && downloadBlob(b, name), 'image/png')
  }

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-8 h-8 mx-auto text-purple-500 mb-2" />
          <p className="text-gray-600">Drag & drop an image, or click to select</p>
          <p className="text-xs text-gray-400 mt-1">
            The AI model (~40 MB) downloads once on first use and is then cached by your browser.
          </p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Original</p>
              <img src={originalUrl!} alt="Original" className="w-full rounded-lg border max-h-80 object-contain bg-gray-50" />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Result</p>
              <div
                className="w-full rounded-lg border h-full min-h-40 max-h-80 flex items-center justify-center"
                style={bg ? { background: bg } : checker}
              >
                {cutoutUrl ? (
                  <img src={cutoutUrl} alt="Result" className="max-h-80 object-contain" />
                ) : busy ? (
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                ) : (
                  <span className="text-sm text-gray-400">Result appears here</span>
                )}
              </div>
            </div>
          </div>

          {busy && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{stage}</p>
              <Progress value={progress} />
            </div>
          )}

          {cutout && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Background</p>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setBg(s.value)}
                    className={`px-4 py-2 rounded-full text-sm ${
                      bg === s.value ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
                <label className="flex items-center gap-2 text-sm text-gray-700 ml-1">
                  Custom
                  <input type="color" value={bg ?? '#8b5cf6'} onChange={(e) => setBg(e.target.value)} />
                </label>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {!cutout ? (
              <Button onClick={remove} disabled={busy} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {busy ? 'Working...' : 'Remove background'}
              </Button>
            ) : (
              <Button onClick={download} className="flex-1 bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" /> Download PNG
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={() => setFile(null)} className="flex-1">
              Choose another image
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
