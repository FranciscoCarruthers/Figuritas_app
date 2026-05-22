'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, CopyPlus, Import as ImportIcon, LogOut, Search, Share, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { ALBUM_GROUPS, getTeamStickers, STICKERS } from '@/data/sticker-data'
import StickerCircle from '@/components/StickerCircle'
import StickerInfoBubble from '@/components/StickerInfoBubble'
import ProgressBar from '@/components/ProgressBar'
import TeamFlag from '@/components/TeamFlag'
import { useAlbum } from '@/context/AlbumContext'
import { useAuth } from '@/context/AuthContext'
import { getProgress, isOwned } from '@/lib/album'
import {
  getNextAlbumBlockLimit,
  getProgressiveAlbumBlocks,
  hasActiveAlbumViewFilters,
  INITIAL_ALBUM_BLOCK_LIMIT,
} from '@/lib/album-rendering'
import { trackAppEvent } from '@/lib/app-analytics'
import { buildImportPreview } from '@/lib/import-preview'
import { parseMissingStickersList } from '@/lib/import-list'
import { buildMissingStickersShareText } from '@/lib/share-list'
import type { StickerBlock } from '@/lib/sticker-blocks'
import type { AlbumState, Sticker } from '@/lib/types'

type FilterMode = 'all' | 'missing' | 'owned'

const FILTERS: Array<{ value: FilterMode; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'missing', label: 'Me faltan' },
  { value: 'owned', label: 'Tengo' },
]

function makeBlocks(): StickerBlock[] {
  const blocks: StickerBlock[] = []
  const fwc = getTeamStickers('FWC')
  const introSection = ALBUM_GROUPS[0]?.label ?? 'Introducción'

  blocks.push({
    id: 'fwc-specials',
    title: 'FWC - Especiales',
    section: introSection,
    stickers: fwc.filter(sticker => sticker.position <= 4),
  })
  blocks.push({
    id: 'fwc-ball-countries',
    title: 'FWC - Balon y Paises',
    section: introSection,
    stickers: fwc.filter(sticker => sticker.position >= 5 && sticker.position <= 8),
  })

  for (const group of ALBUM_GROUPS) {
    for (const team of group.teams) {
      if (team.code === 'FWC') continue
      blocks.push({
        id: team.code,
        title: `${team.code} - ${team.name}`,
        section: group.label,
        stickers: getTeamStickers(team.code),
        teamCode: team.code,
      })
    }
  }

  blocks.push({
    id: 'fwc-history',
    title: 'FWC - Historia',
    section: introSection,
    stickers: fwc.filter(sticker => sticker.position >= 9),
  })

  return blocks
}

const ALL_BLOCKS = makeBlocks()
const LAST_SECTION_STORAGE_KEY = 'figuritasapp:last-section'

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function blockMatchesQuery(block: StickerBlock, query: string) {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) return true

  const searchableBlockText = normalizeSearch(`${block.title} ${block.section} ${block.id}`)
  return searchableBlockText.includes(normalizedQuery)
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-999px'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) throw new Error('No se pudo copiar')
}

export default function AlbumPage() {
  const { albumState, updateQuantity, importMissingCodes, isSyncing, cacheHit, lastSyncedAt } = useAlbum()
  const { profile, signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sectionFilter, setSectionFilter] = useState('Todas')
  const [collapseCompleted, setCollapseCompleted] = useState(false)
  const [foilsMissingOnly, setFoilsMissingOnly] = useState(false)
  const [lastSection, setLastSection] = useState<string | null>(null)
  const [infoSticker, setInfoSticker] = useState<Sticker | null>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ completed: number; total: number } | null>(null)
  const [renderLimit, setRenderLimit] = useState(INITIAL_ALBUM_BLOCK_LIMIT)
  const searchTrackedRef = useRef(false)
  const firstRenderTrackedRef = useRef(false)
  const progress = getProgress(albumState, STICKERS)
  const parsedImport = useMemo(() => parseMissingStickersList(importText), [importText])
  const importPreview = useMemo(() => (
    parsedImport.missingCodes.size > 0
      ? buildImportPreview(STICKERS, albumState, parsedImport.missingCodes)
      : null
  ), [albumState, parsedImport])
  const importProgressPercent = importProgress && importProgress.total > 0
    ? Math.round((importProgress.completed / importProgress.total) * 100)
    : 0

  useEffect(() => {
    const stored = window.localStorage.getItem(LAST_SECTION_STORAGE_KEY)
    if (stored) setLastSection(stored)
  }, [])

  useEffect(() => {
    if (sectionFilter === 'Todas') return
    setLastSection(sectionFilter)
    window.localStorage.setItem(LAST_SECTION_STORAGE_KEY, sectionFilter)
  }, [sectionFilter])

  useEffect(() => {
    if (query.trim().length >= 2 && !searchTrackedRef.current) {
      searchTrackedRef.current = true
      trackAppEvent('album_search_used', { length: query.trim().length })
    }

    if (query.trim().length === 0) searchTrackedRef.current = false
  }, [query])

  const visibleBlocks = useMemo(() => {
    return ALL_BLOCKS.map(block => {
      if (!blockMatchesQuery(block, query)) return { ...block, stickers: [] }

      if (collapseCompleted && getBlockOwnedCount(block, albumState) === block.stickers.length) {
        return { ...block, stickers: [] }
      }

      const stickers = block.stickers.filter(sticker => {
        if (sectionFilter !== 'Todas' && block.section !== sectionFilter) return false
        const owned = isOwned(albumState, sticker.code)
        if (foilsMissingOnly) return sticker.isFoil && !owned
        if (filter === 'missing') return !owned
        if (filter === 'owned') return owned
        return true
      })

      return { ...block, stickers }
    }).filter(block => block.stickers.length > 0)
  }, [albumState, collapseCompleted, filter, foilsMissingOnly, query, sectionFilter])

  const hasActiveFilters = hasActiveAlbumViewFilters({
    query,
    filter,
    sectionFilter,
    collapseCompleted,
    foilsMissingOnly,
  })
  const renderedBlocks = useMemo(() => getProgressiveAlbumBlocks(visibleBlocks, {
    hasActiveFilters,
    limit: renderLimit,
  }), [hasActiveFilters, renderLimit, visibleBlocks])

  useEffect(() => {
    if (hasActiveFilters) return
    setRenderLimit(INITIAL_ALBUM_BLOCK_LIMIT)
  }, [hasActiveFilters])

  useEffect(() => {
    if (hasActiveFilters || renderLimit >= visibleBlocks.length) return

    const loadMore = () => {
      setRenderLimit(current => getNextAlbumBlockLimit(current, visibleBlocks.length))
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(loadMore, { timeout: 600 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = globalThis.setTimeout(loadMore, 120)
    return () => globalThis.clearTimeout(timeoutId)
  }, [hasActiveFilters, renderLimit, visibleBlocks.length])

  useEffect(() => {
    if (firstRenderTrackedRef.current || renderedBlocks.length === 0) return
    firstRenderTrackedRef.current = true
    window.requestAnimationFrame(() => {
      trackAppEvent('album_first_render', {
        ms: Math.round(performance.now()),
        blocks: renderedBlocks.length,
        cacheHit,
        syncing: isSyncing,
      })
    })
  }, [cacheHit, isSyncing, renderedBlocks.length])

  async function toggleSticker(sticker: Sticker) {
    const owned = isOwned(albumState, sticker.code)
    trackAppEvent('album_sticker_toggled', {
      code: sticker.code,
      team: sticker.teamCode,
      nextOwned: !owned,
      foil: sticker.isFoil,
    })
    await updateQuantity(sticker.code, owned ? 0 : 1)
  }

  async function copyMissingStickers() {
    try {
      await copyTextToClipboard(buildMissingStickersShareText(albumState))
      trackAppEvent('share_missing_copied', { missing: progress.missing })
      setShareStatus('copied')
    } catch {
      setShareStatus('error')
    }

    window.setTimeout(() => setShareStatus('idle'), 2400)
  }

  async function handleImportMissing() {
    if (parsedImport.missingCodes.size === 0 || parsedImport.lineCount === 0) {
      setImportStatus('No encontre figuritas en ese texto.')
      return
    }

    setImporting(true)
    setImportStatus(null)
    setImportProgress({ completed: 0, total: 0 })
    try {
      const changed = await importMissingCodes(parsedImport.missingCodes, setImportProgress)
      trackAppEvent('import_completed', {
        missing: parsedImport.missingCodes.size,
        changed,
        lines: parsedImport.lineCount,
      })
      setImportStatus(`Importado: ${parsedImport.missingCodes.size} faltantes. Cambios aplicados: ${changed}.`)
      window.setTimeout(() => {
        setImportOpen(false)
        setImportText('')
        setImportStatus(null)
        setImportProgress(null)
      }, 1400)
    } catch (error) {
      setImportStatus(error instanceof Error
        ? `No se pudo terminar la importacion: ${error.message}`
        : 'No se pudo terminar la importacion. Proba de nuevo.')
    } finally {
      setImporting(false)
    }
  }

  const infoOwned = infoSticker ? isOwned(albumState, infoSticker.code) : false

  return (
    <main className="bg-white pb-5 lg:bg-slate-50 lg:px-6 lg:pb-8">
      <header className="safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 pb-3 backdrop-blur lg:top-0 lg:rounded-b-xl lg:border lg:border-t-0 lg:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black leading-tight text-slate-950">FiguritasApp</h1>
            <p className="text-xs font-black tracking-[0.14em] text-red-700">by Carru</p>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <Link
              href="/repetidas"
              aria-label="Repetidas"
              title="Repetidas"
              className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-full bg-slate-950 text-xs font-black text-white active:bg-slate-800 sm:w-auto sm:px-3"
            >
              <CopyPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Repetidas</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                trackAppEvent('import_preview_opened', { source: 'album_header' })
                setImportOpen(true)
              }}
              aria-label="Importar faltantes"
              title="Importar faltantes"
              className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-full bg-slate-100 text-xs font-black text-slate-950 active:bg-slate-200 sm:w-auto sm:px-3"
            >
              <ImportIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Importar faltantes</span>
            </button>
            <button
              type="button"
              onClick={() => void copyMissingStickers()}
              aria-label="Compartir faltantes"
              title="Compartir faltantes"
              className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-full bg-red-700 text-xs font-black text-white active:bg-red-800 sm:w-auto sm:px-3"
            >
              <Share className="h-4 w-4" />
              <span className="hidden sm:inline">Compartir faltantes</span>
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Cerrar sesion"
              className="grid h-10 w-10 place-items-center rounded-full text-slate-950 active:bg-slate-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p
          aria-live="polite"
          className={`mx-auto mt-2 max-w-6xl text-right text-xs font-bold ${
            shareStatus === 'copied'
              ? 'text-red-700'
              : shareStatus === 'error'
                ? 'text-slate-500'
                : 'text-transparent'
          }`}
        >
          {shareStatus === 'copied'
            ? 'Lista copiada'
            : shareStatus === 'error'
              ? 'No se pudo copiar'
              : 'Listo'}
        </p>

        <div className="mx-auto mt-4 grid max-w-3xl grid-cols-3 text-center">
          {FILTERS.map(item => (
            <button
              type="button"
              key={item.value}
              onClick={() => {
                trackAppEvent('album_filter_changed', { filter: item.value })
                setFilter(item.value)
              }}
              className={`relative h-10 text-base font-semibold ${
                filter === item.value ? 'text-slate-950' : 'text-slate-400'
              }`}
            >
              {item.label}
              {filter === item.value ? (
                <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-red-700" />
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-4 lg:px-0">
        <div className="flex items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar pais o seccion"
              className="min-w-0 flex-1 bg-transparent text-lg font-medium text-slate-950 outline-none placeholder:text-slate-400"
            />
          </label>
          <button
            type="button"
            aria-label="Restablecer filtros"
            onClick={() => {
              setFilter('all')
              setSectionFilter('Todas')
              setQuery('')
              setFoilsMissingOnly(false)
              setCollapseCompleted(false)
            }}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-slate-950 active:bg-slate-100"
          >
            <SlidersHorizontal className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {['Todas', ...ALBUM_GROUPS.map(group => group.label)].map(label => (
            <button
              type="button"
              key={label}
              onClick={() => {
                trackAppEvent('album_filter_changed', { section: label })
                setSectionFilter(label)
              }}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold ${
                sectionFilter === label ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {lastSection && sectionFilter !== lastSection ? (
            <button
              type="button"
              onClick={() => {
                trackAppEvent('album_continue_last_section', { section: lastSection })
                setSectionFilter(lastSection)
              }}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-black text-white active:bg-slate-800"
            >
              Seguir: {lastSection}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const next = !foilsMissingOnly
              trackAppEvent('album_show_foils_missing', { active: next })
              setFoilsMissingOnly(next)
            }}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-black ${
              foilsMissingOnly ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Brillantes faltantes
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !collapseCompleted
              trackAppEvent(next ? 'album_section_collapsed' : 'album_section_expanded', { scope: 'completed' })
              setCollapseCompleted(next)
            }}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-black ${
              collapseCompleted ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {collapseCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Ocultar completos
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 lg:p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
            <span>{progress.owned}/{progress.total}</span>
            <span>{progress.percent}% completo</span>
          </div>
          <ProgressBar value={progress.percent} color="#b91c1c" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500">{profile?.username}</p>
            {isSyncing && cacheHit ? (
              <p className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-700">
                Actualizando...
              </p>
            ) : cacheHit && lastSyncedAt ? (
              <p className="text-[10px] font-bold text-slate-400">
                Actualizado
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6 lg:px-0">
        {visibleBlocks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-bold text-slate-500">No hay figuritas con ese filtro.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {renderedBlocks.map(block => (
              <article key={block.id} className="py-7 first:pt-0">
                <button
                  type="button"
                  className="mb-5 flex w-full items-center gap-2 text-left"
                  onClick={() => setSectionFilter(block.section)}
                >
                  <h2 className="min-w-0 truncate text-2xl font-black tracking-tight text-slate-950">
                    {block.title}
                  </h2>
                  {block.teamCode ? <TeamFlag teamCode={block.teamCode} className="shrink-0" /> : null}
                </button>
                <div className="grid grid-cols-5 gap-x-6 gap-y-6 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                  {block.stickers.map(sticker => (
                    <StickerCircle
                      key={sticker.code}
                      sticker={sticker}
                      owned={isOwned(albumState, sticker.code)}
                      onToggle={() => void toggleSticker(sticker)}
                      onHold={() => setInfoSticker(sticker)}
                    />
                  ))}
                </div>
              </article>
            ))}
            {renderedBlocks.length < visibleBlocks.length ? (
              <div className="py-6 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Cargando mas secciones...
              </div>
            ) : null}
          </div>
        )}
      </section>

      {infoSticker ? (
        <StickerInfoBubble
          sticker={infoSticker}
          owned={infoOwned}
          onClose={() => setInfoSticker(null)}
        />
      ) : null}

      {importOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 backdrop-blur-sm"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 1rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          }}
        >
          <div className="mx-auto flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h3 className="text-xl font-black text-slate-950">Importar faltantes</h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                  Pega una lista exportada desde otra app. La app marcara como faltantes esos numeros y como tengo todos los demas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                disabled={importing}
                aria-label="Cerrar importar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <textarea
                value={importText}
                onChange={event => {
                  setImportText(event.target.value)
                  setImportStatus(null)
                }}
                disabled={importing}
                placeholder={`FiguritasApp - Lista\nMe faltan\nFWC: 00, 1, 2\nARG: 4, 10, 13\nMEX: 1, 5, 20`}
                className="min-h-64 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-950 outline-none focus:border-red-700 disabled:opacity-70"
              />
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-800">
                Importante: esto reemplaza el estado actual del album segun la lista pegada.
              </p>
              {importPreview ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Preview</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-bold text-slate-700">
                    <span className="rounded-lg bg-slate-50 px-3 py-2">Tengo: {importPreview.ownedAfter}</span>
                    <span className="rounded-lg bg-slate-50 px-3 py-2">Faltan: {importPreview.missingAfter}</span>
                    <span className="rounded-lg bg-slate-50 px-3 py-2">A tengo: {importPreview.changesToOwned}</span>
                    <span className="rounded-lg bg-slate-50 px-3 py-2">A falta: {importPreview.changesToMissing}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Se aplicarian {importPreview.totalChanges} cambios reales sobre {importPreview.total} figuritas.
                  </p>
                </div>
              ) : null}
              {importing && importProgress ? (
                <div className="mt-3 rounded-lg bg-slate-100 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-600">
                    <span>Importando...</span>
                    <span>{importProgress.completed}/{importProgress.total} cambios</span>
                  </div>
                  <ProgressBar value={importProgressPercent} color="#b91c1c" />
                </div>
              ) : null}
              {importStatus ? (
                <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{importStatus}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                disabled={importing}
                className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importing || !importPreview}
                onClick={() => void handleImportMissing()}
                className="rounded-lg bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {importing ? 'Importando...' : 'Importar faltantes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function getBlockOwnedCount(block: StickerBlock, albumState: AlbumState) {
  return block.stickers.filter(sticker => isOwned(albumState, sticker.code)).length
}
