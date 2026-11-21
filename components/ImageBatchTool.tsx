'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'
import { Download, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  EXT,
  OutFormat,
  baseName,
  compressImage,
  convertImage,
  downloadBlob,
  formatBytes,
} from '@/lib/imageTools'

export type BatchMode = 'compress' | 'convert' | 'resize'

interface Item {
  id: string
  file: File
  status: 'ready' | 'working' | 'done' | 'error'
  blob?: Blob
  outName?: string
  error?: string
}

const PRESETS = [
  { label: 'Light', quality: 0.85, hint: 'Best quality' },
  { label: 'Balanced', quality: 0.7, hint: 'Recommended' },
  { label: 'Strong', quality: 0.5, hint: 'Smallest size' },
]

const chip = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm transition-colors ${
    active ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  }`

export default function ImageBatchTool({ mode, multiple = true }: { mode: BatchMode; multiple?: boolean }) {
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // compress options
  const [quality, setQuality] = useState(0.7)
  const [toWebp, setToWebp] = useState(false)
  // convert options
  const [format, setFormat] = useState<OutFormat>('image/webp')
  const [convQuality, setConvQuality] = useState(90)
  // resize options
  const [percent, setPercent] = useState<number | null>(50)
  const [maxSide, setMaxSide] = useState('')

  const onDrop = useCallback(
    (accepted: File[]) => {
      setError(null)
      const next = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        status: 'ready' as const,
      }))
      setItems((prev) => (multiple ? [...prev, ...next] : next.slice(0, 1)))
    },
    [multiple]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    multiple,
  })

  // any option change invalidates old results
  useEffect(() => {
    setItems((prev) => prev.map((i) => ({ ...i, status: 'ready', blob: undefined, outName: undefined })))
  }, [quality, toWebp, format, convQuality, percent, maxSide])

  const run = async () => {
    setBusy(true)
    setError(null)
    const side = parseInt(maxSide, 10)
    for (const item of items) {
      setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: 'working' } : i)))
      try {
        let blob: Blob
        let ext: string
        if (mode === 'compress') {
          blob = await compressImage(item.file, { quality, toWebp })
          ext = toWebp ? 'webp' : item.file.name.split('.').pop() || 'jpg'
        } else if (mode === 'convert') {
          blob = await convertImage(item.file, format, convQuality / 100)
          ext = EXT[format]
        } else {
          const outFormat = (['image/jpeg', 'image/png', 'image/webp'].includes(item.file.type)
            ? item.file.type
            : 'image/png') as OutFormat
          blob = await convertImage(item.file, outFormat, 0.92, {
            scale: percent ? percent / 100 : 1,
            maxSide: !percent && side > 0 ? side : undefined,
          })
          ext = EXT[outFormat]
        }
        const suffix = mode === 'compress' ? '_reduced' : mode === 'resize' ? '_resized' : ''
        const outName = `${baseName(item.file.name)}${suffix}.${ext}`
        setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: 'done', blob, outName } : i)))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed'
        setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: 'error', error: msg } : i)))
      }
    }
    setBusy(false)
  }

  const done = items.filter((i) => i.status === 'done' && i.blob)
  const totalBefore = done.reduce((s, i) => s + i.file.size, 0)
  const totalAfter = done.reduce((s, i) => s + (i.blob?.size ?? 0), 0)

  const downloadZip = async () => {
    const zip = new JSZip()
    const used = new Set<string>()
    for (const i of done) {
      let name = i.outName!
      let n = 1
      while (used.has(name)) name = `${baseName(i.outName!)}_${n++}.${name.split('.').pop()}`
      used.add(name)
      zip.file(name, i.blob!)
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${mode}-images.zip`)
  }

  const actionLabel = mode === 'compress' ? 'Reduce' : mode === 'convert' ? 'Convert' : 'Resize'

  return (
    <div className="space-y-6">
      {/* Options */}
      {mode === 'compress' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Compression level</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setQuality(p.quality)} className={chip(quality === p.quality)}>
                {p.label} <span className="opacity-70 text-xs">({p.hint})</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={toWebp} onChange={(e) => setToWebp(e.target.checked)} />
            Also convert to WebP (much smaller, especially for PNGs)
          </label>
        </div>
      )}

      {mode === 'convert' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Convert to</p>
          <div className="flex flex-wrap gap-2">
            {(['image/jpeg', 'image/png', 'image/webp'] as OutFormat[]).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={chip(format === f)}>
                {EXT[f].toUpperCase()}
              </button>
            ))}
          </div>
          {format !== 'image/png' && (
            <div className="max-w-xs">
              <label htmlFor="convQuality" className="text-sm text-gray-700">Quality: {convQuality}%</label>
              <input
                id="convQuality"
                type="range"
                min={30}
                max={100}
                value={convQuality}
                onChange={(e) => setConvQuality(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          )}
        </div>
      )}

      {mode === 'resize' && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Resize</p>
          <div className="flex flex-wrap gap-2">
            {[25, 50, 75].map((p) => (
              <button key={p} onClick={() => setPercent(p)} className={chip(percent === p)}>
                {p}%
              </button>
            ))}
            <button onClick={() => setPercent(null)} className={chip(percent === null)}>
              Custom size
            </button>
          </div>
          {percent === null && (
            <div className="max-w-xs">
              <label htmlFor="maxSide" className="text-sm text-gray-700">Longest side (pixels)</label>
              <input
                id="maxSide"
                type="number"
                min={16}
                value={maxSide}
                onChange={(e) => setMaxSide(e.target.value)}
                placeholder="e.g. 1280"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Aspect ratio is always kept. Images are never enlarged.</p>
            </div>
          )}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-8 h-8 mx-auto text-purple-500 mb-2" />
        <p className="text-gray-600">
          {isDragActive ? 'Drop here...' : `Drag & drop ${multiple ? 'images' : 'an image'}, or click to select`}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{i.file.name}</p>
                <p className="text-gray-500">
                  {formatBytes(i.file.size)}
                  {i.status === 'done' && i.blob && (
                    <>
                      {' → '}
                      <span className="text-green-600 font-medium">{formatBytes(i.blob.size)}</span>
                      {i.blob.size < i.file.size && (
                        <span className="text-green-600"> (-{Math.round((1 - i.blob.size / i.file.size) * 100)}%)</span>
                      )}
                    </>
                  )}
                  {i.status === 'error' && <span className="text-red-600"> {i.error}</span>}
                </p>
              </div>
              {i.status === 'working' && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
              {i.status === 'done' && i.blob && (
                <Button size="sm" variant="outline" onClick={() => downloadBlob(i.blob!, i.outName!)}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {!busy && (
                <button
                  aria-label="Remove"
                  onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={run}
            disabled={busy || (mode === 'resize' && percent === null && !(parseInt(maxSide, 10) > 0))}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {busy ? 'Working...' : `${actionLabel} ${items.length} image${items.length > 1 ? 's' : ''}`}
          </Button>
          {done.length > 1 && (
            <Button onClick={downloadZip} className="flex-1 bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" /> Download all (.zip)
            </Button>
          )}
          {done.length === 1 && items.length === 1 && (
            <Button
              onClick={() => downloadBlob(done[0].blob!, done[0].outName!)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          )}
        </div>
      )}

      {done.length > 1 && mode === 'compress' && totalAfter < totalBefore && (
        <p className="text-sm text-center text-gray-600">
          Saved {formatBytes(totalBefore - totalAfter)} in total ({Math.round((1 - totalAfter / totalBefore) * 100)}%)
        </p>
      )}
    </div>
  )
}
