'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Search, SlidersHorizontal } from 'lucide-react'
import { ALBUM_GROUPS, STICKERS } from '@/data/sticker-data'
import TeamCard from '@/components/TeamCard'
import StickerResultButton from '@/components/StickerResultButton'
import ProgressBar from '@/components/ProgressBar'
import { useAlbum } from '@/context/AlbumContext'
import { useAuth } from '@/context/AuthContext'
import { getProgress, getQuantity } from '@/lib/album'
import { searchStickers } from '@/lib/sticker-search'

type FilterMode = 'all' | 'owned' | 'missing' | 'duplicates'

const FILTERS: Array<{ value: FilterMode; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'owned', label: 'Tengo' },
  { value: 'missing', label: 'Faltan' },
  { value: 'duplicates', label: 'Repetidas' },
]

export default function AlbumPage() {
  const router = useRouter()
  const { albumState } = useAlbum()
  const { profile, signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [sectionFilter, setSectionFilter] = useState('Todas')
  const progress = getProgress(albumState, STICKERS)
  const stickerSection = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of ALBUM_GROUPS) {
      for (const team of group.teams) map.set(team.code, group.label)
    }
    return map
  }, [])

  const stickerResults = useMemo(() => {
    const results = query.trim() ? searchStickers(query) : []
    return results.filter(sticker => {
      const quantity = getQuantity(albumState, sticker.code)
      if (sectionFilter !== 'Todas' && stickerSection.get(sticker.teamCode) !== sectionFilter) return false
      if (filter === 'owned') return quantity > 0
      if (filter === 'missing') return quantity === 0
      if (filter === 'duplicates') return quantity > 1
      return true
    })
  }, [albumState, filter, query, sectionFilter, stickerSection])

  const isSearching = query.trim().length > 0
  const visibleGroups = sectionFilter === 'Todas'
    ? ALBUM_GROUPS
    : ALBUM_GROUPS.filter(group => group.label === sectionFilter)

  return (
    <main className="px-4 pb-5 pt-5">
      <header className="safe-top">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Album compartido</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Mundial 2026</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{profile?.username}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Cerrar sesion"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-slate-600 shadow-sm active:bg-slate-100"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <section className="mt-5 rounded-lg bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/15">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-300">Progreso total</p>
              <p className="mt-1 text-3xl font-black">{progress.percent}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">{progress.owned}/{progress.total}</p>
              <p className="text-xs font-semibold text-slate-300">{progress.duplicates} repetidas</p>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress.percent} color="#38bdf8" />
          </div>
        </section>
      </header>

      <div className="mt-5 space-y-3">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar equipo, codigo o jugador"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          {FILTERS.map(item => (
            <button
              type="button"
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`h-9 shrink-0 rounded-lg px-3 text-sm font-black ${
                filter === item.value ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 shadow-sm'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['Todas', ...ALBUM_GROUPS.map(group => group.label)].map(label => (
            <button
              type="button"
              key={label}
              onClick={() => setSectionFilter(label)}
              className={`h-9 shrink-0 rounded-lg px-3 text-sm font-black ${
                sectionFilter === label ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 shadow-sm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isSearching ? (
        <section className="mt-5 space-y-2">
          {stickerResults.length > 0 ? (
            stickerResults.map(sticker => (
              <StickerResultButton
                key={sticker.code}
                sticker={sticker}
                onClick={() => {
                  router.push(`/album/${sticker.teamCode}`)
                }}
              />
            ))
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
              No encontre figuritas con ese filtro.
            </p>
          )}
        </section>
      ) : (
        <section className="mt-6 space-y-7">
          {visibleGroups.map(group => (
            <div key={group.label}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{group.label}</h2>
              <div className="grid grid-cols-2 gap-3">
                {group.teams.map(team => (
                  <TeamCard key={team.code} code={team.code} name={team.name} group={group.label} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
