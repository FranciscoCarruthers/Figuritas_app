'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleDashed, Clock3, RefreshCw, Search, Users } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import TeamFlag from '@/components/TeamFlag'
import { ALBUM_GROUPS, getTeamStickers } from '@/data/sticker-data'
import { trackAppEvent } from '@/lib/app-analytics'
import { getProgress, isOwned } from '@/lib/album'
import { buildFriendAlbumState, formatFriendLastUpdate } from '@/lib/friends'
import { buildAlbumBlocks, type StickerBlock } from '@/lib/sticker-blocks'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { FriendAlbumSticker, Sticker } from '@/lib/types'

type FriendFilter = 'missing' | 'owned' | 'all'

const ALL_BLOCKS = buildAlbumBlocks(ALBUM_GROUPS, getTeamStickers)
const ORDERED_STICKERS = ALL_BLOCKS.flatMap(block => block.stickers)

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function matchesSearch(block: StickerBlock, sticker: Sticker, query: string): boolean {
  if (!query) return true
  const haystack = normalize(`${block.title} ${block.section} ${block.id} ${sticker.code} ${sticker.teamCode} ${sticker.team}`)
  return haystack.includes(query)
}

function filterLabel(filter: FriendFilter): string {
  if (filter === 'missing') return 'Le faltan'
  if (filter === 'owned') return 'Tiene'
  return 'Todas'
}

function asAlbumRows(data: unknown): FriendAlbumSticker[] {
  return (Array.isArray(data) ? data : []) as FriendAlbumSticker[]
}

export default function FriendAlbumPage() {
  const params = useParams<{ username: string }>()
  const requestedUsername = decodeURIComponent(String(params.username ?? '')).toLowerCase()
  const [rows, setRows] = useState<FriendAlbumSticker[]>([])
  const [friendUsername, setFriendUsername] = useState(requestedUsername)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FriendFilter>('missing')
  const [query, setQuery] = useState('')

  const albumState = useMemo(() => buildFriendAlbumState(rows), [rows])
  const progress = useMemo(() => getProgress(albumState, ORDERED_STICKERS), [albumState])
  const lastUpdatedAt = rows[0]?.last_updated_at ?? null
  const searchQuery = normalize(query)

  const visibleBlocks = useMemo(() => {
    return ALL_BLOCKS.map(block => {
      const stickers = block.stickers.filter(sticker => {
        const owned = isOwned(albumState, sticker.code)
        if (filter === 'missing' && owned) return false
        if (filter === 'owned' && !owned) return false
        return matchesSearch(block, sticker, searchQuery)
      })

      return { ...block, stickers }
    }).filter(block => block.stickers.length > 0)
  }, [albumState, filter, searchQuery])

  const loadAlbum = useCallback(async (trackRefresh = false) => {
    setLoading(true)
    setError('')
    const supabase = getSupabaseBrowserClient()
    const { data, error: rpcError } = await supabase.rpc('get_friend_album', { p_username: requestedUsername })
    if (rpcError) {
      setError(rpcError.message)
    } else {
      const nextRows = asAlbumRows(data)
      setRows(nextRows)
      setFriendUsername(nextRows[0]?.username ?? requestedUsername)
      if (trackRefresh) {
        trackAppEvent('friends_refreshed', { username: requestedUsername })
      } else {
        trackAppEvent('friend_album_opened', { username: requestedUsername })
      }
    }
    setLoading(false)
  }, [requestedUsername])

  useEffect(() => {
    void loadAlbum()
  }, [loadAlbum])

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 lg:px-8 lg:pb-8">
      <header className="safe-top pb-5 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/amigos"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 active:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Amigos
          </Link>
          <button
            type="button"
            onClick={() => void loadAlbum(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 active:bg-slate-100"
            aria-label="Refrescar album del amigo"
            title="Refrescar album del amigo"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs font-black tracking-[0.08em] text-red-700">Album de amigo</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{friendUsername}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
          <Clock3 className="h-4 w-4" />
          Ultima actualizacion: {formatFriendLastUpdate(lastUpdatedAt)}
        </p>
      </header>

      {error ? (
        <section className="grid place-items-center rounded-xl border border-red-100 bg-red-50 px-6 py-16 text-center">
          <Users className="h-10 w-10 text-red-300" />
          <p className="mt-4 text-sm font-bold text-red-700">{error}</p>
          <Link href="/amigos" className="mt-4 rounded-lg bg-red-700 px-4 py-3 text-sm font-black text-white">
            Volver a amigos
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Album completo</p>
                <p className="mt-1 text-5xl font-black tracking-tight text-slate-950">
                  {loading ? '-' : `${progress.percent}%`}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-700">
                {progress.missing === 0 && !loading ? <CheckCircle2 className="h-6 w-6" /> : <CircleDashed className="h-6 w-6" />}
              </span>
            </div>
            <div className="mt-4">
              <ProgressBar value={loading ? 0 : progress.percent} color="#b91c1c" />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm font-black text-slate-600">
              <span>{loading ? '-' : `${progress.owned}/${progress.total}`} tiene</span>
              <span>{loading ? '-' : progress.missing} faltan</span>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {(['missing', 'owned', 'all'] as FriendFilter[]).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`h-11 rounded-lg text-sm font-black transition ${
                    filter === item ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-500 active:bg-slate-200'
                  }`}
                >
                  {filterLabel(item)}
                </button>
              ))}
            </div>
            <label className="mt-3 flex h-12 items-center gap-3 rounded-lg bg-slate-50 px-3 text-slate-500">
              <Search className="h-5 w-5" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar pais, seccion o codigo"
                className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400"
              />
            </label>
          </section>

          {loading ? (
            <section className="mt-5 grid gap-2 lg:grid-cols-2">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-white shadow-sm" />
              ))}
            </section>
          ) : visibleBlocks.length === 0 ? (
            <section className="mt-6 grid place-items-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <CircleDashed className="h-10 w-10 text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-500">No hay resultados para este filtro.</p>
            </section>
          ) : (
            <section className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4 shadow-sm lg:px-6">
              {visibleBlocks.map(block => (
                <article key={block.id} className="py-6 first:pt-5">
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="flex min-w-0 items-center gap-2 text-2xl font-black tracking-tight text-slate-950">
                        <span className="min-w-0 truncate">{block.title}</span>
                        {block.teamCode ? <TeamFlag teamCode={block.teamCode} className="shrink-0" /> : null}
                      </h2>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        {block.section}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {block.stickers.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-x-4 gap-y-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                    {block.stickers.map(sticker => {
                      const owned = isOwned(albumState, sticker.code)
                      const status = owned ? 'Tiene' : 'Falta'

                      return (
                        <div key={sticker.code} className="min-w-0">
                          <div
                            className={`grid aspect-square w-full place-items-center rounded-full text-sm font-black transition ${
                              owned
                                ? 'bg-red-700 text-white shadow-sm'
                                : sticker.isFoil
                                  ? 'border border-amber-300 bg-amber-50 text-amber-800'
                                  : 'bg-slate-100 text-slate-500'
                            }`}
                            role="img"
                            aria-label={`${sticker.code} - ${sticker.name}. ${status}.`}
                            title={`${sticker.code} - ${sticker.name}. ${status}.`}
                          >
                            {sticker.position === 0 ? '00' : sticker.position}
                          </div>
                          <p className="mt-1 truncate text-center text-[10px] font-black uppercase tracking-[0.04em] text-slate-400">
                            {sticker.code}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  )
}
