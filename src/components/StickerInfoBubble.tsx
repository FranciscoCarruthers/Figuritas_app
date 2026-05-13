'use client'

import type { Sticker } from '@/lib/types'

export default function StickerInfoBubble({
  sticker,
  owned,
  onClose,
}: {
  sticker: Sticker
  owned: boolean
  onClose: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar informacion de figurita"
      className="fixed inset-0 z-50 bg-transparent"
    >
      <span className="pointer-events-none fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] mx-auto block max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xl shadow-slate-950/20">
        <span className="block text-xs font-black uppercase tracking-[0.14em] text-red-700">{sticker.code}</span>
        <span className="mt-1 block text-xl font-black leading-tight text-slate-950">{sticker.name}</span>
        <span className="mt-1 block text-sm font-semibold text-slate-500">{sticker.team}</span>
        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {owned ? 'La tengo' : 'Me falta'}
        </span>
      </span>
    </button>
  )
}
