'use client'

import { Minus, Plus, X } from 'lucide-react'
import type { Sticker } from '@/lib/types'
import { useAlbum } from '@/context/AlbumContext'

export default function StickerTile({ sticker }: { sticker: Sticker }) {
  const { albumState, updateQuantity, incrementQuantity } = useAlbum()
  const quantity = albumState[sticker.code]?.quantity ?? 0
  const owned = quantity > 0
  const duplicateCount = Math.max(0, quantity - 1)

  const stateClass = owned
    ? duplicateCount > 0
      ? 'border-amber-300 bg-amber-50 text-amber-950'
      : 'border-emerald-300 bg-emerald-50 text-emerald-950'
    : 'border-slate-200 bg-white text-slate-500'

  return (
    <div className={`min-h-[112px] rounded-lg border p-2 shadow-sm ${stateClass}`}>
      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          onClick={() => {
            if (!owned) void updateQuantity(sticker.code, 1)
          }}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-[11px] font-black tracking-wide">
            {sticker.code}
            {sticker.isFoil ? ' FOIL' : ''}
          </span>
          <span className={`mt-1 block truncate text-xs font-semibold ${owned ? 'text-slate-900' : 'text-slate-500'}`}>
            {sticker.name}
          </span>
        </button>
        {owned ? (
          <button
            type="button"
            aria-label={`Desmarcar ${sticker.code}`}
            onClick={() => void updateQuantity(sticker.code, 0)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/10 text-slate-700 active:bg-black/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={`Restar ${sticker.code}`}
          disabled={!owned}
          onClick={() => void incrementQuantity(sticker.code, -1)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-35"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-bold text-slate-500">Tengo</p>
          <p className="text-sm font-black text-slate-950">{quantity}</p>
        </div>
        <button
          type="button"
          aria-label={`Sumar ${sticker.code}`}
          onClick={() => void incrementQuantity(sticker.code, 1)}
          className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white active:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {duplicateCount > 0 ? (
        <p className="mt-2 rounded-md bg-amber-200/70 px-2 py-1 text-center text-[11px] font-black text-amber-900">
          {duplicateCount} repetida{duplicateCount === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  )
}
