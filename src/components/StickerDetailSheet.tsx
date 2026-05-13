'use client'

import { Check, X } from 'lucide-react'
import type { Sticker } from '@/lib/types'

export default function StickerDetailSheet({
  sticker,
  owned,
  onClose,
  onSetOwned,
}: {
  sticker: Sticker
  owned: boolean
  onClose: () => void
  onSetOwned: (owned: boolean) => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md px-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">{sticker.code}</p>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">{sticker.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{sticker.team}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSetOwned(true)}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-black ${
              owned ? 'bg-red-700 text-white' : 'bg-red-50 text-red-800 active:bg-red-100'
            }`}
          >
            <Check className="h-4 w-4" />
            La tengo
          </button>
          <button
            type="button"
            onClick={() => onSetOwned(false)}
            className="h-11 rounded-lg bg-slate-100 text-sm font-black text-slate-700 active:bg-slate-200"
          >
            Me falta
          </button>
        </div>
      </section>
    </div>
  )
}
