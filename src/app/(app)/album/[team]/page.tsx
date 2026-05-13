'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import StickerCircle from '@/components/StickerCircle'
import StickerDetailSheet from '@/components/StickerDetailSheet'
import { useAlbum } from '@/context/AlbumContext'
import { getProgress, isOwned } from '@/lib/album'
import { getTeamByCode, getTeamStickers } from '@/data/sticker-data'
import type { Sticker } from '@/lib/types'

export default function TeamPage() {
  const params = useParams<{ team: string }>()
  const router = useRouter()
  const teamCode = String(params.team ?? '').toUpperCase()
  const team = getTeamByCode(teamCode)
  const stickers = useMemo(() => getTeamStickers(teamCode), [teamCode])
  const { albumState, updateQuantity } = useAlbum()
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null)

  if (!team) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Equipo no encontrado</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">El codigo {teamCode} no esta en la checklist.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-red-700 px-4 py-3 text-sm font-black text-white" href="/album">
            Volver al album
          </Link>
        </div>
      </main>
    )
  }

  const progress = getProgress(albumState, stickers)
  const selectedOwned = selectedSticker ? isOwned(albumState, selectedSticker.code) : false

  async function toggleSticker(sticker: Sticker) {
    const owned = isOwned(albumState, sticker.code)
    setSelectedSticker(sticker)
    await updateQuantity(sticker.code, owned ? 0 : 1)
  }

  async function setStickerOwned(sticker: Sticker, owned: boolean) {
    setSelectedSticker(sticker)
    await updateQuantity(sticker.code, owned ? 1 : 0)
  }

  return (
    <main className="bg-white">
      <header className="safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 pb-4 pt-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Volver"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-950 active:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">{teamCode}</p>
            <h1 className="truncate text-2xl font-black text-slate-950">{team.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-950">{progress.owned}/{progress.total}</p>
            <p className="text-xs font-bold text-slate-500">{progress.percent}%</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={progress.percent} color="#b91c1c" />
        </div>
      </header>

      <section className="px-4 py-6">
        <div className="grid grid-cols-5 gap-x-6 gap-y-6">
          {stickers.map(sticker => (
            <StickerCircle
              key={sticker.code}
              sticker={sticker}
              owned={isOwned(albumState, sticker.code)}
              onToggle={() => void toggleSticker(sticker)}
            />
          ))}
        </div>
      </section>

      {selectedSticker ? (
        <StickerDetailSheet
          sticker={selectedSticker}
          owned={selectedOwned}
          onClose={() => setSelectedSticker(null)}
          onSetOwned={owned => void setStickerOwned(selectedSticker, owned)}
        />
      ) : null}
    </main>
  )
}
