'use client'

import Link from 'next/link'
import { Tags } from 'lucide-react'
import { INTRO_TEAM, STICKERS_MAP, TEAMS } from '@/data/sticker-data'
import { useAlbum } from '@/context/AlbumContext'
import type { TeamInfo } from '@/lib/types'

export default function RepetidasPage() {
  const { albumState, incrementQuantity } = useAlbum()
  const allTeams: TeamInfo[] = [INTRO_TEAM, ...TEAMS]
  const groups = allTeams
    .map(team => ({
      team,
      stickers: Object.values(albumState)
        .filter(row => row.quantity > 1 && STICKERS_MAP[row.sticker_code]?.teamCode === team.code)
        .sort((a, b) => (STICKERS_MAP[a.sticker_code]?.position ?? 0) - (STICKERS_MAP[b.sticker_code]?.position ?? 0)),
    }))
    .filter(group => group.stickers.length > 0)

  const totalDuplicates = Object.values(albumState).reduce((sum, row) => sum + Math.max(0, row.quantity - 1), 0)

  return (
    <main className="px-4 pb-5 pt-5">
      <header className="safe-top">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Intercambios</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Repetidas</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">{totalDuplicates} figuritas para cambiar</p>
      </header>

      {groups.length === 0 ? (
        <section className="mt-8 grid place-items-center rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Tags className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-500">Todavia no hay repetidas.</p>
        </section>
      ) : (
        <section className="mt-6 space-y-6">
          {groups.map(({ team, stickers }) => (
            <div key={team.code}>
              <Link href={`/album/${team.code}`} className="mb-2 block text-sm font-black text-slate-800">
                {team.name}
              </Link>
              <div className="space-y-2">
                {stickers.map(row => {
                  const sticker = STICKERS_MAP[row.sticker_code]
                  if (!sticker) return null
                  const extras = row.quantity - 1

                  return (
                    <div
                      key={row.sticker_code}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black text-amber-950">{sticker.code}</p>
                        <p className="truncate text-sm font-semibold text-slate-700">{sticker.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void incrementQuantity(sticker.code, -1)}
                        className="shrink-0 rounded-lg bg-amber-200 px-3 py-2 text-sm font-black text-amber-950 active:bg-amber-300"
                      >
                        x{extras}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
