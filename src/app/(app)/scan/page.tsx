'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Check, Keyboard, Loader2, ScanLine, X } from 'lucide-react'
import StickerResultButton from '@/components/StickerResultButton'
import { STICKERS_MAP } from '@/data/sticker-data'
import { useAlbum } from '@/context/AlbumContext'
import { getQuantity, isOwned } from '@/lib/album'
import { trackAppEvent } from '@/lib/app-analytics'
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

type ScanMode = 'camera' | 'manual'

function svgPoints(points: [ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null): string {
  if (!points) return ''
  return points.map(point => `${point.x * 100},${point.y * 100}`).join(' ')
}

function DetectionPanel({
  sticker,
  owned,
  quantity,
  lastRead,
  saving,
  onSave,
  onClose,
  closeLabel,
  className,
}: {
  sticker: Sticker
  owned: boolean
  quantity: number
  lastRead?: string
  saving: boolean
  onSave: () => void
  onClose: () => void
  closeLabel: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 text-slate-950 shadow-2xl ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">{sticker.code}</p>
          <h2 className="mt-1 truncate text-2xl font-black leading-tight">{sticker.name}</h2>
          <p className="text-sm font-semibold text-slate-500">{sticker.team}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar deteccion"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black ${owned ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
          {owned ? `La tengo${quantity > 1 ? ` x${quantity}` : ''}` : 'Me falta'}
        </span>
        {lastRead ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            Lectura {lastRead}
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {!owned ? (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 text-sm font-black text-white active:bg-red-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Agregar
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className={`${owned ? 'col-span-2' : ''} h-11 rounded-lg bg-slate-100 px-3 text-sm font-black text-slate-700 active:bg-slate-200`}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  )
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const historyRef = useRef<ScanReading[]>([])
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState('Abri la camara para empezar.')
  const [mode, setMode] = useState<ScanMode>('camera')
  const [manual, setManual] = useState('')
  const [candidates, setCandidates] = useState<Sticker[]>([])
  const [selected, setSelected] = useState<Sticker | null>(null)
  const [cardPoints, setCardPoints] = useState<[ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null>(null)
  const [codeBoxPoints, setCodeBoxPoints] = useState<[ScanPoint, ScanPoint, ScanPoint, ScanPoint] | null>(null)
  const [lastRead, setLastRead] = useState('')
  const [lastConfidence, setLastConfidence] = useState<number | null>(null)
  const [diagnostic, setDiagnostic] = useState('Esperando camara.')
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const lastTrackedStatusRef = useRef('')
  const { albumState, updateQuantity } = useAlbum()
  const selectedOwned = selected ? isOwned(albumState, selected.code) : false
  const selectedQuantity = selected ? getQuantity(albumState, selected.code) : 0

  function resetDetection() {
    historyRef.current = []
    setCardPoints(null)
    setCodeBoxPoints(null)
    setLastRead('')
    setLastConfidence(null)
    setDiagnostic(cameraReady ? 'Buscando figurita.' : 'Esperando camara.')
  }

  const updateScanStatus = useCallback((message: string, eventStatus?: string) => {
    setScanStatus(message)
    if (eventStatus && lastTrackedStatusRef.current !== eventStatus) {
      lastTrackedStatusRef.current = eventStatus
      trackAppEvent('scanner_card_status', { status: eventStatus })
    }
  }, [])

  async function startCamera() {
    setCameraError(null)
    updateScanStatus('Preparando camara...', 'opening')
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
      setDiagnostic('Camara activa. Buscando bordes de la figurita.')
      trackAppEvent('scanner_opened', { mode: 'live' })
      updateScanStatus('Buscando figurita...', 'searching_card')
    } catch {
      setCameraError('No pude abrir la camara. Revisa permisos de Safari y que la app este en HTTPS.')
      setDiagnostic('No se pudo abrir la camara.')
      updateScanStatus('Camara no disponible.', 'camera_error')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraReady(false)
    setSelected(null)
    setCandidates([])
    updateScanStatus('Abri la camara para empezar.', 'idle')
    setDiagnostic('Esperando camara.')
    resetDetection()
  }

  function closeDetection() {
    setSelected(null)
    setCandidates([])
    setManual('')
    resetDetection()
    if (mode === 'camera') {
      updateScanStatus(cameraReady ? 'Buscando figurita...' : 'Abri la camara para empezar.', cameraReady ? 'searching_card' : 'idle')
    }
  }

  function switchMode(nextMode: ScanMode) {
    if (nextMode === mode) return

    setMode(nextMode)
    setSelected(null)
    setCandidates([])
    setManual('')
    resetDetection()
    trackAppEvent('scanner_mode_changed', { mode: nextMode })

    if (nextMode === 'manual') {
      if (cameraReady) stopCamera()
      setScanStatus('Abri la camara para empezar.')
    } else {
      updateScanStatus(cameraReady ? 'Buscando figurita...' : 'Abri la camara para empezar.', cameraReady ? 'searching_card' : 'idle')
    }
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      void disposeOcrWorker()
    }
  }, [])

  useEffect(() => {
    if (mode !== 'camera' || !cameraReady || selected) return

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
          setLastConfidence(null)
          setDiagnostic('No veo una figurita rectangular clara. Acercala o enderezala un poco.')
          updateScanStatus(vision.message, vision.status)
          return
        }

        setDiagnostic('Figurita detectada. Recortando la esquina superior derecha.')
        updateScanStatus('Leyendo codigo...', 'reading_code')
        const result = await recognizeStickerCode(vision.codeCanvases)
        if (cancelled) return

        const reading: ScanReading = {
          code: result.code,
          confidence: result.confidence,
          text: result.text,
        }
        historyRef.current = appendScanReading(historyRef.current, reading)
        setLastRead(result.code ? `${result.code} (${result.confidence})` : 'Sin lectura clara')
        setLastConfidence(result.confidence)

        const stableCode = getStableScanCode(historyRef.current)
        if (stableCode && STICKERS_MAP[stableCode]) {
          setSelected(STICKERS_MAP[stableCode])
          trackAppEvent('scanner_code_detected', {
            code: stableCode,
            confidence: result.confidence,
            owned: isOwned(albumState, stableCode),
          })
          setDiagnostic('Codigo estable. Revisa la figurita antes de agregarla.')
          updateScanStatus('Figurita detectada.', 'code_stable')
          return
        }

        setDiagnostic(result.code
          ? 'Lectura posible. Mantene la camara quieta para confirmar.'
          : 'No pude leer el codigo. Mejora la luz o apunta al ovalo superior derecho.')
        updateScanStatus(result.code ? 'Confirmando codigo...' : 'Ajusta luz o acerca un poco.', result.code ? 'confirming_code' : 'code_unclear')
      } catch {
        setDiagnostic('El scanner se esta preparando. Probando de nuevo.')
        updateScanStatus('Preparando scanner...', 'scanner_loading')
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
  }, [albumState, cameraReady, mode, selected, updateScanStatus])

  function handleManualLookup(value: string) {
    setManual(value)
    const code = parseStickerCode(value)
    if (code && STICKERS_MAP[code]) {
      setCandidates([])
      setSelected(STICKERS_MAP[code])
      if (mode === 'camera') setScanStatus('Figurita cargada manualmente.')
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
      trackAppEvent('scanner_added_to_album', {
        code: selected.code,
        team: selected.teamCode,
        source: mode === 'manual' ? 'manual_popup' : 'scanner_popup',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-5 pt-5 lg:px-8 lg:pb-8">
      <header className="safe-top">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Scanner</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Escanear</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Usa la camara en vivo o carga el codigo a mano cuando quieras ir mas rapido.
        </p>
      </header>

      <section className="mt-5 grid grid-cols-2 rounded-full bg-slate-100 p-1">
        {([
          { value: 'camera', label: 'Camara', icon: Camera },
          { value: 'manual', label: 'Manual', icon: Keyboard },
        ] as const).map(item => {
          const Icon = item.icon
          const active = mode === item.value

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => switchMode(item.value)}
              className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-black transition ${
                active ? 'bg-red-700 text-white shadow-sm' : 'text-slate-500 active:bg-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </section>

      {mode === 'camera' ? (
        <>
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
            <DetectionPanel
              sticker={selected}
              owned={selectedOwned}
              quantity={selectedQuantity}
              lastRead={lastRead}
              saving={saving}
              onSave={() => void saveSelected()}
              onClose={closeDetection}
              closeLabel="Seguir escaneando"
              className="absolute inset-x-3 bottom-3"
            />
          ) : null}
        </div>

        <div className="grid gap-3 bg-white p-3">
          <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs font-bold text-slate-600 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Figurita</p>
              <p className="mt-1 text-slate-900">{cardPoints ? 'Detectada' : 'Buscando'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Codigo</p>
              <p className="mt-1 text-slate-900">{lastRead || 'Sin lectura'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Diagnostico</p>
              <p className="mt-1 text-slate-900">{lastConfidence === null ? diagnostic : `${diagnostic} Confianza ${lastConfidence}.`}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
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
        </div>
      </section>

      {cameraError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{cameraError}</p> : null}
      </>
      ) : null}

      {mode === 'manual' ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

          {selected ? (
            <DetectionPanel
              sticker={selected}
              owned={selectedOwned}
              quantity={selectedQuantity}
              saving={saving}
              onSave={() => void saveSelected()}
              onClose={closeDetection}
              closeLabel={selectedOwned ? 'Cerrar' : 'No agregar'}
              className="mt-4 shadow-sm"
            />
          ) : null}

          {candidates.length > 0 && !selected ? (
            <div className="mt-4 space-y-2">
              {candidates.map(sticker => (
                <StickerResultButton key={sticker.code} sticker={sticker} onClick={() => setSelected(sticker)} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}
