'use client'

import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Sticker } from '@/lib/types'

function getStickerLabel(sticker: Sticker): string {
  if (sticker.code === '00') return '00'
  return String(sticker.position)
}

export default function StickerCircle({
  sticker,
  owned,
  onToggle,
  onHold,
}: {
  sticker: Sticker
  owned: boolean
  onToggle: () => void
  onHold: () => void
}) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didHoldRef = useRef(false)

  function startHold(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    didHoldRef.current = false
    holdTimerRef.current = setTimeout(() => {
      didHoldRef.current = true
      onHold()
    }, 450)
  }

  function clearHold() {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }

  return (
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
      onContextMenu={event => event.preventDefault()}
      onClick={event => {
        if (didHoldRef.current) {
          event.preventDefault()
          didHoldRef.current = false
          return
        }
        onToggle()
      }}
      aria-pressed={owned}
      aria-label={`${owned ? 'Desmarcar' : 'Marcar'} ${sticker.code} ${sticker.name}`}
      className={`grid aspect-square w-full min-w-0 touch-manipulation select-none place-items-center rounded-full text-base font-semibold transition active:scale-95 ${
        owned
          ? 'border-2 border-red-700 bg-red-50 text-red-900 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.75)]'
          : 'border border-slate-100 bg-slate-100 text-slate-500'
      }`}
    >
      {getStickerLabel(sticker)}
    </button>
  )
}
