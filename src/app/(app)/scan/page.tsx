'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Keyboard, Loader2, Plus, ScanLine, X } from 'lucide-react'
import StickerResultButton from '@/components/StickerResultButton'
import { useAlbum } from '@/context/AlbumContext'
import { findStickerCandidates, parseStickerCode } from '@/lib/sticker-search'
import { STICKERS_MAP } from '@/data/sticker-data'
import type { Sticker } from '@/lib/types'

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [manual, setManual] = useState('')
  const [candidates, setCandidates] = useState<Sticker[]>([])
  const [selected, setSelected] = useState<Sticker | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const { albumState, updateQuantity, incrementQuantity } = useAlbum()

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

  function captureCanvas(): HTMLCanvasElement | null {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth === 0) return null

    const width = video.videoWidth
    const height = video.videoHeight
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, width, height)
    return canvas
  }

  async function scanFrame() {
    const canvas = captureCanvas()
    if (!canvas) return

    setScanning(true)
    setSelected(null)
    setCandidates([])
    setOcrText('')

    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng')
      const { data } = await worker.recognize(canvas)
      await worker.terminate()
      setOcrText(data.text)
      const found = findStickerCandidates(data.text)
      setCandidates(found)
      if (found.length === 1) setSelected(found[0])
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

  async function saveSelected(kind: 'owned' | 'duplicate') {
    if (!selected) return
    setSaving(true)
    try {
      const current = albumState[selected.code]?.quantity ?? 0
      if (kind === 'owned') {
        await updateQuantity(selected.code, Math.max(1, current))
      } else {
        await incrementQuantity(selected.code, 1)
      }
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
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Camara</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Escanear</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Lee el codigo del dorso y confirma antes de guardar.</p>
      </header>

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
        <div className="relative aspect-[3/4] bg-slate-900">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {!cameraReady ? (
            <div className="absolute inset-0 grid place-items-center px-8 text-center text-white">
              <div>
                <ScanLine className="mx-auto h-12 w-12 text-sky-300" />
                <p className="mt-3 text-sm font-semibold text-slate-300">Apunta al numero y abreviacion del pais.</p>
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-sky-300/90" />
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
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 text-sm font-black text-white active:bg-sky-700 disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Leer
          </button>
        </div>
      </section>

      <canvas ref={canvasRef} className="hidden" />

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
        <section className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Confirmar figurita</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{selected.code}</h2>
          <p className="font-semibold text-slate-700">{selected.name}</p>
          <p className="text-sm font-medium text-slate-500">{selected.team}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSelected('owned')}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-black text-white active:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              La tengo
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSelected('duplicate')}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-black text-amber-950 active:bg-amber-400 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Repetida
            </button>
          </div>
        </section>
      ) : null}
    </main>
  )
}
