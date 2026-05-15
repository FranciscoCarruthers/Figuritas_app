'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Keyboard, Loader2, ScanLine, X } from 'lucide-react'
import StickerResultButton from '@/components/StickerResultButton'
import { STICKERS_MAP } from '@/data/sticker-data'
import { useAlbum } from '@/context/AlbumContext'
import { getQuantity, isOwned } from '@/lib/album'
import {
  appendScanReading,
  getStableScanCode,
  type ScanPoint,
  type ScanReading,
} from '@/lib/scan-detection'
import { disposeOcrWorker, recognizeStickerCode } from '@/lib/scan-ocr'
import { extractStickerCodeCanvases } from '@/lib/scan-vision'
import { findStickerCandidates, parseStickerCode } from '@/lib/sticker-search'
import type { Sticker } from '@/lib/types'

const SCAN_INTERVAL_MS = 250

function svgPoints(points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null): string {
  if (!points) return ''
  return points.map(point => `${point.x * 100},${point.y * 100}`).join(' ')
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const historyRef = useRef<ScanReading[]>([])
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState('Abri la camara para empezar.')
  const [manual, setManual] = useState('')
  const [candidates, setCandidates] = useState<Sticker[]>([])
  const [selected, setSelected] = useState<Sticker | null>(null)
  const [cardPoints, setCardPoints] = useState<[ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null>(null)
  const [codeBoxPoints, setCodeBoxPoints] = useState<[ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null>(null)
  const [lastRead, setLastRead] = useState('')
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const { albumState, updateQuantity } = useAlbum()
  const selectedOwned = selected ? isOwned(albumState, selected.code) : false
  const selectedQuantity = selected ? getQuantity(albumState, selected.code) : 0

  function resetDetection() {
    historyRef.current = []
    setCardPoints(null)
    setCodeBoxPoints(null)
    setLastRead('')
  }

  async function startCamera() {
    setCameraError(null)
    setScanStatus('Preparando camara...')
    resetDetection()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
      setScanStatus('Buscando figurita...')
    } catch {
      setCameraError('No pude abrir la camara. Revisa permisos de Safari y que la app este en HTTPS.')
      setScanStatus('Camara no disponible.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraReady(false)
    setSelected(null)
    setCandidates([])
    setScanStatus('Abri la camara para empezar.')
    resetDetection()
  }

  function closeDetection() {
    setSelected(null)
    setCandidates([])
    setManual('')
    resetDetection()
    setScanStatus(cameraReady ? 'Buscando figurita...' : 'Abri la camara para empezar.')
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      void disposeOcrWorker()
    }
  }, [])

  useEffect(() => {
    if (!cameraReady || selected) return

    let cancelled = false
    let timer: number | null = null

    async function tick() {
      if (cancelled) return

      setScanning(true)
      try {
        const vision = await extractStickerCodeCanvases(videoRef.current)
        if (cancelled) return

        setCardPoints(vision.cardPoints)
        setCodeBoxPoints(vision.codeBoxPoints)

        if (vision.status !== 'card-found') {
          historyRef.current = appendScanReading(historyRef.current, { code: null, confidence: 0, text: '' })
          setScanStatus(vision.message)
          return
        }

        setScanStatus('Leyendo codigo...')
        const result = await recognizeStickerCode(vision.codeCanvases)
        if (cancelled) return

        const reading: ScanReading = {
          code: result.code,
          confidence: result.confidence,
          text: result.text,
        }
        historyRef.current = appendScanReading(historyRef.current, reading)
        setLastRead(result.code ? `${result.code} (${result.confidence})` : 'Sin lectura clara')

        const stableCode = getStableScanCode(historyRef.current)
        if (stableCode && STICKERS_MAP[stableCode]) {
          setSelected(STICKERS_MAP[stableCode])
          setScanStatus('Figurita detectada.')
          return
        }

        setScanStatus(result.code ? 'Confirmando codigo...' : 'Ajusta luz o acerca un poco.')
      } catch {
        setScanStatus('Preparando scanner...')
      } finally {
        setScanning(false)
        if (!cancelled) {
          timer = window.setTimeout(tick, SCAN_INTERVAL_MS)
        }
      }
    }

    timer = window.setTimeout(tick, 200)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [cameraReady, selected])

  function handleManualLookup(value: string) {
    setManual(value)
    const code = parseStickerCode(value)
    if (code && STICKERS_MAP[code]) {
      setCandidates([])
      setSelected(STICKERS_MAP[code])
      setScanStatus('Figurita cargada manualmente.')
      return
    }

    setSelected(null)
    setCandidates(findStickerCandidates(value))
  }

  async function saveSelected() {
    if (!selected) return
    setSaving(true)
    try {
      await updateQuantity(selected.code, 1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-5 pt-5 lg:px-8 lg:pb-8">
      <header className="safe-top">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Camara</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Escanear</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Apunta a la figurita. La app busca el codigo superior derecho automaticamente.
        </p>
      </header>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm">
        <div className="relative aspect-[9/16] bg-slate-900 lg:aspect-[16/10]">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />

          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {cardPoints ? (
              <polygon
                points={svgPoints(cardPoints)}
                fill="rgba(255,255,255,0.06)"
                stroke="#dc2626"
                strokeWidth="0.65"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {codeBoxPoints ? (
              <polygon
                points={svgPoints(codeBoxPoints)}
                fill="rgba(254,242,242,0.22)"
                stroke="#fef2f2"
                strokeWidth="0.55"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full bg-slate-950/70 px-3 py-2 text-xs font-black text-white shadow-lg">
            {scanning && cameraReady && !selected ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
            <span className="truncate">{scanStatus}</span>
          </div>

          {!cameraReady ? (
            <div className="absolute inset-0 grid place-items-center px-8 text-center text-white">
              <div>
                <ScanLine className="mx-auto h-12 w-12 text-red-200" />
                <p className="mt-3 text-sm font-semibold text-slate-300">
                  La deteccion arranca sola cuando activas la camara.
                </p>
              </div>
            </div>
          ) : null}

          {selected ? (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">{selected.code}</p>
                  <h2 className="mt-1 truncate text-2xl font-black leading-tight">{selected.name}</h2>
                  <p className="text-sm font-semibold text-slate-500">{selected.team}</p>
                </div>
                <button
                  type="button"
                  onClick={closeDetection}
                  aria-label="Cerrar deteccion"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-black ${selectedOwned ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {selectedOwned ? `La tengo${selectedQuantity > 1 ? ` x${selectedQuantity}` : ''}` : 'Me falta'}
                </span>
                {lastRead ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    Lectura {lastRead}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {!selectedOwned ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSelected()}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 text-sm font-black text-white active:bg-red-800 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Agregar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closeDetection}
                  className={`${selectedOwned ? 'col-span-2' : ''} h-11 rounded-lg bg-slate-100 px-3 text-sm font-black text-slate-700 active:bg-slate-200`}
                >
                  Seguir escaneando
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <button
            type="button"
            onClick={cameraReady ? stopCamera : startCamera}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-black text-white active:bg-slate-700"
          >
            {cameraReady ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {cameraReady ? 'Cerrar camara' : 'Abrir camara'}
          </button>
          <p className="text-center text-xs font-bold text-slate-500 sm:text-right">
            {cameraReady ? 'Reconocimiento en vivo' : 'Gratis y local'}
          </p>
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
          placeholder="Ej: COL16, GHA19, PAN19"
          autoCapitalize="characters"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-base font-black text-slate-950 outline-none focus:border-red-700"
        />
      </section>

      {candidates.length > 0 && !selected ? (
        <section className="mt-4 space-y-2">
          {candidates.map(sticker => (
            <StickerResultButton key={sticker.code} sticker={sticker} onClick={() => setSelected(sticker)} />
          ))}
        </section>
      ) : null}
    </main>
  )
}
