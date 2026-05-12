'use client'

import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import { getProgress } from '@/lib/album'
import { getTeamColor } from '@/lib/team-colors'
import { useAlbum } from '@/context/AlbumContext'
import { getTeamStickers } from '@/data/sticker-data'
import ProgressBar from '@/components/ProgressBar'

export default function TeamCard({ code, name, group }: { code: string; name: string; group?: string }) {
  const { albumState } = useAlbum()
  const color = getTeamColor(code)
  const progress = getProgress(albumState, getTeamStickers(code))

  return (
    <Link
      href={`/album/${code}`}
      className="block rounded-lg border bg-white p-3 shadow-sm transition active:scale-[0.98]"
      style={{ borderColor: `${color}55` }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{name}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{group ?? code}</p>
        </div>
        <div
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {progress.percent === 100 ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>
      <ProgressBar value={progress.percent} color={color} />
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold" style={{ color }}>
          {progress.owned}/{progress.total}
        </span>
        <span className="font-medium text-slate-500">{progress.percent}%</span>
      </div>
    </Link>
  )
}
