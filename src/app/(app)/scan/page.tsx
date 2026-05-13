'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Keyboard, Loader2, ScanLine, X } from 'lucide-react'
import StickerResultButton from '@/components/StickerResultButton'
import { useAlbum } from '@/context/AlbumContext'
import { findStickerCandidates, parseStickerCode, parseStickerCodeFromText } from '@/lib/sticker-search'
import { STICKERS_MAP } from '@/data/sticker-data'
import type { Sticker } from '@/lib/types'

type ScanRegion = {
  id: string
  left: number
  top: number
  width: number
  height: number
}

type ProcessMode = 'contrast' | 'invert' | 'threshold' | 'invert-threshold'

const SCAN_REGIONS: ScanRegion[] = [
  { id: 'recuadro', left: 0.18, top: 0.24, width: 0.64, height: 0.18 },
  { id: 'arriba-derecha', left: 0.48, top: 0.06, width: 0.46, height: 0.18 },
  { id: 'arriba-ancho', left: 0.12, top: 0.05, width: 0.78, height: 0.22 },
  { id: 'centro-ancho', left: 0.10, top: 0.20, width: 0.80, height: 0.26 },
]

const PRIMARY_MODES: ProcessMode[] = ['invert-threshold', 'invert', 'threshold', 'contrast']
const FALLBACK_MODES: ProcessMode[] = ['invert-threshold', 'invert', 'threshold']

function processPixelValue(value: number, mode: ProcessMode): number {
  if (mode === 'threshold') return value > 145 ? 255 : 0
  if (mode === 'invert-threshold') return value > 145 ? 0 : 255
  if (mode === 'invert') return 255 - value
  return value
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [manual, setManual] = useState('')
  const [candidates, setCandidates] = useState<Sticker[]>([])
  const [selected, setSelected] = useState<Sticker | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const { updateQuantity } = useAlbum()

  async function startCamera() {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
    } catch {
      setCameraError('No pude abrir la camara. Revisa permisos de Safari y que la app este en HTTPS.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  function captureCodeCanvas(region: ScanRegion, mode: ProcessMode): HTMLCanvasElement | null {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null

    const width = video.videoWidth
    const height = video.videoHeight
    const displayWidth = video.clientWidth || width
    const displayHeight = video.clientHeight || height
    const coverScale = Math.max(displayWidth / width, displayHeight / height)
    const renderedWidth = width * coverScale
    const renderedHeight = height * coverScale
    const offsetX = (renderedWidth - displayWidth) / 2
    const offsetY = (renderedHeight - displayHeight) / 2
    const targetWidth = displayWidth * region.width
    const targetHeight = displayHeight * region.height
    const targetX = displayWidth * region.left
    const targetY = displayHeight * region.top
    const sourceWidth = Math.max(1, Math.round(targetWidth / coverScale))
    const sourceHeight = Math.max(1, Math.round(targetHeight / coverScale))
    const sourceX = Math.round(Math.max(0, Math.min(width - sourceWidth, (targetX + offsetX) / coverScale)))
    const sourceY = Math.round(Math.max(0, Math.min(height - sourceHeight, (targetY + offsetY) / coverScale)))
    const scale = 4

    const canvas = document.createElement('canvas')
    canvas.width = sourceWidth * scale
    canvas.height = sourceHeight * scale
    const context = canvas.getContext('2d')
    if (!context) return null

    context.imageSmoothingEnabled = true
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const { data } = imageData
    for (let index = 0; index < data.length; index += 4) {
      const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
      const contrasted = Math.max(0, Math.min(255, (gray - 128) * 2 + 128))
      const value = processPixelValue(contrasted, mode)
      data[index] = value
      data[index + 1] = value
      data[index + 2] = value
      data[index + 3] = 255
    }
    context.putImageData(imageData, 0, 0)

    return canvas
  }

  async function scanFrame() {
    const attempts = SCAN_REGIONS.flatMap((region, index) => {
      const modes = index === 0 ? PRIMARY_MODES : FALLBACK_MODES
      return modes.map(mode => ({ region, mode, canvas: captureCodeCanvas(region, mode) }))
    }).filter((attempt): attempt is { region: ScanRegion; mode: ProcessMode; canvas: HTMLCanvasElement } => Boolean(attempt.canvas))
    if (attempts.length === 0) return

    setScanning(true)
    setSelected(null)
    setCandidates([])
    setOcrText('')
    setCameraError(null)

    try {
      const { createWorker, PSM } = await import('tesseract.js')
      const worker = await createWorker('eng')
      const detectedParts: string[] = []
      let detectedCode: string | null = null
      try {
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        })
        for (const attempt of attempts) {
          const result = await worker.recognize(attempt.canvas)
          const text = result.data.text.trim()
          detectedParts.push(`${attempt.region.id}/${attempt.mode}: ${text || 'sin texto'}`)
          detectedCode = parseStickerCodeFromText(text)
          if (detectedCode) break
        }
      } finally {
        await worker.terminate()
      }
      const detectedText = detectedParts.join('\n')
      setOcrText(detectedText)
      const found = detectedCode ? [STICKERS_MAP[detectedCode]] : []
      setCandidates(found)
      if (found.length === 1) {
        setSelected(found[0])
      } else {
        setCameraError('No encontre el codigo. Pone solo la etiqueta PAR 19 dentro del recuadro rojo.')
      }
    } catch {
      setCameraError('El OCR no pudo leer la imagen. Proba acercar la camara o usa carga manual.')
    } finally {
      setScanning(false)
    }
  }

  function handleManualLookup(value: string) {
    setManual(value)
    const code = parseStickerCode(value)
    setSelected(code ? STICKERS_MAP[code] : null)
    setCandidates(code ? [STICKERS_MAP[code]] : findStickerCandidates(value))
  }

  async function saveSelected() {
    if (!selected) return
    setSaving(true)
    try {
      await updateQuantity(selected.code, 1)
      setManual('')
      setOcrText('')
      setCandidates([])
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="px-4 pb-5 pt-5">
      <header className="safe-top">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Camara</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Escanear</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Lee el codigo superior derecho y confirma antes de guardar.</p>
      </header>

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
        <div className="relative aspect-[3/4] bg-slate-900">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {!cameraReady ? (
            <div className="absolute inset-0 grid place-items-center px-8 text-center text-white">
              <div>
                <ScanLine className="mx-auto h-12 w-12 text-red-200" />
                <p className="mt-3 text-sm font-semibold text-slate-300">Pone solo el codigo tipo PAR 19 dentro del recuadro.</p>
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute left-[18%] top-[24%] h-[18%] w-[64%] rounded-xl border-2 border-red-200/90 bg-white/5 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
          <div className="pointer-events-none absolute left-[18%] top-[43%] w-[64%] text-center text-xs font-black uppercase tracking-[0.12em] text-white/85">
            PAR 19
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-white p-3">
          <button
            type="button"
            onClick={cameraReady ? stopCamera : startCamera}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-black text-white active:bg-slate-700"
          >
            {cameraReady ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {cameraReady ? 'Cerrar' : 'Camara'}
          </button>
          <button
            type="button"
            disabled={!cameraReady || scanning}
            onClick={() => void scanFrame()}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 text-sm font-black text-white active:bg-red-800 disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Leer
          </button>
        </div>
      </section>

      {cameraError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{cameraError}</p> : null}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
          <Keyboard className="h-4 w-4" />
          Carga manual
        </label>
        <input
          value={manual}
          onChange={event => handleManualLookup(event.target.value)}
          placeholder="Ej: ARG15, ARG 15, FWC10"
          autoCapitalize="characters"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-base font-black text-slate-950 outline-none"
        />
      </section>

      {ocrText ? (
        <section className="mt-4 rounded-lg bg-slate-100 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Texto detectado</p>
          <p className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-xs font-semibold text-slate-700">{ocrText}</p>
        </section>
      ) : null}

      {candidates.length > 0 && !selected ? (
        <section className="mt-4 space-y-2">
          {candidates.map(sticker => (
            <StickerResultButton key={sticker.code} sticker={sticker} onClick={() => setSelected(sticker)} />
          ))}
        </section>
      ) : null}

      {selected ? (
        <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">Confirmar figurita</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{selected.code}</h2>
          <p className="font-semibold text-slate-700">{selected.name}</p>
          <p className="text-sm font-medium text-slate-500">{selected.team}</p>
          <div className="mt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSelected()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-700 text-sm font-black text-white active:bg-red-800 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              La tengo
            </button>
          </div>
        </section>
      ) : null}
    </main>
  )
}
