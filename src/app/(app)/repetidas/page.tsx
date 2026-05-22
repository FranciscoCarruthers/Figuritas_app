'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Minus, Plus, Search, Sparkles } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import TeamFlag from '@/components/TeamFlag'
import { ALBUM_GROUPS, getTeamStickers, STICKERS, STICKERS_MAP } from '@/data/sticker-data'
import { useAlbum } from '@/context/AlbumContext'
import { useAuth } from '@/context/AuthContext'
import { getProgress, isOwned } from '@/lib/album'
import { trackAppEvent } from '@/lib/app-analytics'
import { buildAlbumBlocks, type StickerBlock } from '@/lib/sticker-blocks'
import { findStickerCandidates, parseStickerCode } from '@/lib/sticker-search'
import { getDuplicateCount, getNextDuplicateQuantity, isFormationSticker } from '@/lib/trades'
import type { Sticker } from '@/lib/types'

type RepeatedFilter = 'all' | 'with' | 'without' | 'foils' | 'formations'

const FILTERS: Array<{ value: RepeatedFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'with', label: 'Con repetidas' },
  { value: 'without', label: 'Sin repetidas' },
  { value: 'foils', label: 'Brillantes' },
  { value: 'formations', label: 'Formaciones' },
]

const ALL_BLOCKS = buildAlbumBlocks(ALBUM_GROUPS, getTeamStickers)

function getDisplayNumber(sticker: Sticker) {
  return sticker.code === '00' ? '00' : sticker.position
}

function blockMatchesFilter(block: StickerBlock, filter: RepeatedFilter, albumState: ReturnType<typeof useAlbum>['albumState']) {
  const stickers = block.stickers.filter(sticker => {
    const duplicateCount = getDuplicateCount(albumState, sticker.code)
    const owned = isOwned(albumState, sticker.code)

    if (filter === 'with') return duplicateCount > 0
    if (filter === 'without') return owned && duplicateCount === 0
    if (filter === 'foils') return sticker.isFoil
    if (filter === 'formations') return isFormationSticker(sticker)
    return true
  })

  return { ...block, stickers }
}

export default function RepetidasPage() {
  const { albumState, updateQuantity, isSyncing, cacheHit } = useAlbum()
  const { profile } = useAuth()
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<Sticker | null>(null)
  const [filter, setFilter] = useState<RepeatedFilter>('all')
  const [status, setStatus] = useState<string | null>(null)

  const progress = getProgress(albumState, STICKERS)
  const totalDuplicates = useMemo(
    () => STICKERS.reduce((total, sticker) => total + getDuplicateCount(albumState, sticker.code), 0),
    [albumState],
  )
  const candidates = useMemo(() => (
    input.trim().length > 0 ? findStickerCandidates(input).filter(sticker => sticker.code !== selected?.code).slice(0, 4) : []
  ), [input, selected])
  const blocks = useMemo(() => (
    ALL_BLOCKS.map(block => blockMatchesFilter(block, filter, albumState)).filter(block => block.stickers.length > 0)
  ), [albumState, filter])

  function selectFromInput(value: string) {
    setInput(value)
    setStatus(null)
    const code = parseStickerCode(value)
    setSelected(code ? STICKERS_MAP[code] ?? null : null)
  }

  async function changeDuplicate(sticker: Sticker, delta: 1 | -1, clearAfter = false) {
    const current = albumState[sticker.code]?.quantity ?? 0
    const nextQuantity = getNextDuplicateQuantity(current, delta)

    if (delta < 0 && getDuplicateCount(albumState, sticker.code) === 0) return

    await updateQuantity(sticker.code, nextQuantity)
    trackAppEvent(delta > 0 ? 'duplicate_added' : 'duplicate_removed', {
      code: sticker.code,
      team: sticker.teamCode,
      foil: sticker.isFoil,
    })
    setStatus(delta > 0 ? `Sumaste repetida de ${sticker.code}.` : `Restaste repetida de ${sticker.code}.`)

    if (clearAfter && delta > 0) {
      setInput('')
      setSelected(null)
    }
  }

  return (
    <main className="min-h-dvh bg-white pb-5 lg:bg-slate-50 lg:px-6 lg:pb-8">
      <header className="safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 pb-3 backdrop-blur lg:rounded-b-xl lg:border lg:border-t-0 lg:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/album"
              aria-label="Volver al album"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-950 active:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black leading-tight text-slate-950">Repetidas</h1>
              <p className="text-xs font-black tracking-[0.14em] text-red-700">FiguritasApp</p>
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-red-700 px-3 py-2 text-sm font-black text-white">
            {totalDuplicates} repes
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-4 lg:px-0">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
            <span>{progress.owned}/{progress.total}</span>
            <span>{totalDuplicates} repetidas</span>
          </div>
          <ProgressBar value={Math.min(100, Math.round((totalDuplicates / Math.max(1, progress.total)) * 100))} color="#b91c1c" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">{profile?.username}</p>
            {isSyncing && cacheHit ? (
              <p className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-700">
                Actualizando...
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Carga rapida</p>
          <label className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-slate-500" />
            <input
              value={input}
              onChange={event => selectFromInput(event.target.value)}
              placeholder="Codigo: ARG10, FWC5, 00..."
              inputMode="text"
              autoCapitalize="characters"
              className="min-w-0 flex-1 bg-transparent text-lg font-black uppercase text-slate-950 outline-none placeholder:normal-case placeholder:text-slate-400"
            />
          </label>

          {candidates.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {candidates.map(candidate => (
                <button
                  key={candidate.code}
                  type="button"
                  onClick={() => {
                    setSelected(candidate)
                    setInput(candidate.code)
                  }}
                  className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                >
                  {candidate.code}
                </button>
              ))}
            </div>
          ) : null}

          {selected ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">{selected.code}</p>
                  <h2 className="mt-1 truncate text-xl font-black text-slate-950">{selected.name}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">{selected.team}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                  Total {albumState[selected.code]?.quantity ?? 0}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                <span className={isOwned(albumState, selected.code) ? 'rounded-full bg-red-50 px-3 py-1.5 text-red-700' : 'rounded-full bg-slate-100 px-3 py-1.5 text-slate-500'}>
                  {isOwned(albumState, selected.code) ? 'La tengo' : 'No marcada'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                  {getDuplicateCount(albumState, selected.code)} repetidas disponibles
                </span>
                {selected.isFoil ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">Brillante</span>
                ) : null}
                {isFormationSticker(selected) ? (
                  <span className="rounded-full bg-slate-950 px-3 py-1.5 text-white">Formacion</span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={getDuplicateCount(albumState, selected.code) === 0}
                  onClick={() => void changeDuplicate(selected, -1)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" />
                  repetida
                </button>
                <button
                  type="button"
                  onClick={() => void changeDuplicate(selected, 1, true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white active:bg-red-800"
                >
                  <Plus className="h-5 w-5" />
                  repetida
                </button>
              </div>
            </div>
          ) : null}

          {status ? (
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{status}</p>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-black ${
                filter === item.value ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.value === 'foils' ? <Sparkles className="mr-1 inline h-4 w-4 align-[-2px]" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-5 lg:px-0">
        {blocks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-bold text-slate-500">No hay figuritas para este filtro.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {blocks.map(block => (
              <article key={block.id} className="py-7 first:pt-0">
                <div className="mb-5 flex w-full items-center gap-2 text-left">
                  <h2 className="min-w-0 truncate text-2xl font-black tracking-tight text-slate-950">{block.title}</h2>
                  {block.teamCode ? <TeamFlag teamCode={block.teamCode} className="shrink-0" /> : null}
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                  {block.stickers.map(sticker => (
                    <RepeatedStickerControl
                      key={sticker.code}
                      sticker={sticker}
                      quantity={albumState[sticker.code]?.quantity ?? 0}
                      onChange={delta => void changeDuplicate(sticker, delta)}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function RepeatedStickerControl({
  sticker,
  quantity,
  onChange,
}: {
  sticker: Sticker
  quantity: number
  onChange: (delta: 1 | -1) => void
}) {
  const duplicateCount = Math.max(0, quantity - 1)
  const isFoil = sticker.isFoil

  return (
    <div className="select-none rounded-xl border border-slate-200 bg-white p-2 text-center shadow-sm">
      <div
        className={`relative mx-auto grid h-14 w-14 place-items-center rounded-full text-base font-black ${
          duplicateCount > 0
            ? 'bg-red-700 text-white ring-4 ring-red-100'
            : isFoil
              ? 'border border-amber-300 bg-amber-50 text-amber-900'
              : 'bg-slate-100 text-slate-600'
        }`}
      >
        {getDisplayNumber(sticker)}
        {duplicateCount > 0 ? (
          <span className="absolute -right-2 -top-2 min-w-7 rounded-full bg-slate-950 px-1.5 py-1 text-[10px] font-black leading-none text-white">
            x{duplicateCount}
          </span>
        ) : null}
      </div>
      <p className="mt-2 truncate text-[11px] font-black text-slate-500">{sticker.code}</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={duplicateCount === 0}
          onClick={() => onChange(-1)}
          aria-label={`Restar repetida ${sticker.code}`}
          className="grid h-9 place-items-center rounded-lg bg-slate-100 text-slate-700 disabled:opacity-35"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange(1)}
          aria-label={`Sumar repetida ${sticker.code}`}
          className="grid h-9 place-items-center rounded-lg bg-red-700 text-white active:bg-red-800"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
