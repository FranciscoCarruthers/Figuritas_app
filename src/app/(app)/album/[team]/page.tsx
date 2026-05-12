'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import StickerTile from '@/components/StickerTile'
import { useAlbum } from '@/context/AlbumContext'
import { getProgress } from '@/lib/album'
import { getTeamColor } from '@/lib/team-colors'
import { getTeamByCode, getTeamStickers } from '@/data/sticker-data'

export default function TeamPage() {
  const params = useParams<{ team: string }>()
  const router = useRouter()
  const teamCode = String(params.team ?? '').toUpperCase()
  const team = getTeamByCode(teamCode)
  const stickers = useMemo(() => getTeamStickers(teamCode), [teamCode])
  const { albumState } = useAlbum()

  if (!team) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Equipo no encontrado</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">El codigo {teamCode} no esta en la checklist.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white" href="/album">
            Volver al album
          </Link>
        </div>
      </main>
    )
  }

  const color = getTeamColor(teamCode)
  const progress = getProgress(albumState, stickers)

  return (
    <main>
      <header className="safe-top px-4 pb-5 pt-5" style={{ backgroundColor: `${color}14` }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color }}>
              {teamCode}
            </p>
            <h1 className="truncate text-2xl font-black text-slate-950">{team.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-950">{progress.owned}/{progress.total}</p>
            <p className="text-xs font-bold text-slate-500">{progress.percent}%</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={progress.percent} color={color} />
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          {progress.missing === 0 ? 'Equipo completo' : `Faltan ${progress.missing}`}
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2 px-4 pt-4">
        {stickers.map(sticker => (
          <StickerTile key={sticker.code} sticker={sticker} />
        ))}
      </section>
    </main>
  )
}
