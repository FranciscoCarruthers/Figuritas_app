'use client'

import { useMemo, useState } from 'react'
import { LogOut, Search, Share, SlidersHorizontal } from 'lucide-react'
import { ALBUM_GROUPS, getTeamStickers, STICKERS } from '@/data/sticker-data'
import StickerCircle from '@/components/StickerCircle'
import StickerInfoBubble from '@/components/StickerInfoBubble'
import ProgressBar from '@/components/ProgressBar'
import TeamFlag from '@/components/TeamFlag'
import { useAlbum } from '@/context/AlbumContext'
import { useAuth } from '@/context/AuthContext'
import { getProgress, isOwned } from '@/lib/album'
import { buildMissingStickersShareText } from '@/lib/share-list'
import type { Sticker } from '@/lib/types'

type FilterMode = 'all' | 'missing' | 'owned'

type StickerBlock = {
  id: string
  title: string
  section: string
  stickers: Sticker[]
  teamCode?: string
}

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
  const { albumState, updateQuantity } = useAlbum()
  const { profile, signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sectionFilter, setSectionFilter] = useState('Todas')
  const [infoSticker, setInfoSticker] = useState<Sticker | null>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const progress = getProgress(albumState, STICKERS)

  const visibleBlocks = useMemo(() => {
    return ALL_BLOCKS.map(block => {
      if (!blockMatchesQuery(block, query)) return { ...block, stickers: [] }

      const stickers = block.stickers.filter(sticker => {
        if (sectionFilter !== 'Todas' && block.section !== sectionFilter) return false
        const owned = isOwned(albumState, sticker.code)
        if (filter === 'missing') return !owned
        if (filter === 'owned') return owned
        return true
      })

      return { ...block, stickers }
    }).filter(block => block.stickers.length > 0)
  }, [albumState, filter, query, sectionFilter])

  async function toggleSticker(sticker: Sticker) {
    const owned = isOwned(albumState, sticker.code)
    await updateQuantity(sticker.code, owned ? 0 : 1)
  }

  async function copyMissingStickers() {
    try {
      await copyTextToClipboard(buildMissingStickersShareText(albumState))
      setShareStatus('copied')
    } catch {
      setShareStatus('error')
    }

    window.setTimeout(() => setShareStatus('idle'), 2400)
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
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void copyMissingStickers()}
              aria-label="Copiar figuritas faltantes"
              className="grid h-10 w-10 place-items-center rounded-full text-slate-950 active:bg-slate-100"
            >
              <Share className="h-5 w-5" />
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
              onClick={() => setFilter(item.value)}
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
              onClick={() => setSectionFilter(label)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold ${
                sectionFilter === label ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 lg:p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
            <span>{progress.owned}/{progress.total}</span>
            <span>{progress.percent}% completo</span>
          </div>
          <ProgressBar value={progress.percent} color="#b91c1c" />
          <p className="mt-2 text-xs font-semibold text-slate-500">{profile?.username}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6 lg:px-0">
        {visibleBlocks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-bold text-slate-500">No hay figuritas con ese filtro.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {visibleBlocks.map(block => (
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
    </main>
  )
}
