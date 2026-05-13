'use client'

import type { Sticker } from '@/lib/types'

function getStickerLabel(sticker: Sticker): string {
  if (sticker.code === '00') return '00'
  return String(sticker.position)
}

export default function StickerCircle({
  sticker,
  owned,
  onToggle,
}: {
  sticker: Sticker
  owned: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={owned}
      aria-label={`${owned ? 'Desmarcar' : 'Marcar'} ${sticker.code} ${sticker.name}`}
      className={`grid aspect-square w-full min-w-0 place-items-center rounded-full text-base font-semibold transition active:scale-95 ${
        owned
          ? 'border-2 border-red-700 bg-red-50 text-red-900 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.75)]'
          : 'border border-slate-100 bg-slate-100 text-slate-500'
      }`}
    >
      {getStickerLabel(sticker)}
    </button>
  )
}
