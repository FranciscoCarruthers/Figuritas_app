'use client'

import { useEffect, useRef, useState } from 'react'
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
  const previousOwnedRef = useRef(owned)
  const [isPopping, setIsPopping] = useState(false)

  useEffect(() => {
    if (previousOwnedRef.current === owned) return
    previousOwnedRef.current = owned
    setIsPopping(true)
    const timeout = setTimeout(() => setIsPopping(false), 320)
    return () => clearTimeout(timeout)
  }, [owned])

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

  const stateClass = sticker.isFoil
    ? owned
      ? 'border-2 border-amber-500 bg-amber-100 text-amber-950 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.65),0_0_0_1px_rgba(180,83,9,0.18)]'
      : 'border border-amber-200 bg-amber-50 text-amber-800'
    : owned
      ? 'border-2 border-red-700 bg-red-50 text-red-900 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.75)]'
      : 'border border-slate-100 bg-slate-100 text-slate-500'

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
      className={`no-ios-selection relative grid aspect-square w-full min-w-0 touch-manipulation select-none place-items-center overflow-hidden rounded-full text-base font-semibold transition active:scale-95 ${isPopping ? 'sticker-pop' : ''} ${stateClass}`}
    >
      <span className={owned ? 'translate-y-0 transition' : 'transition'}>{getStickerLabel(sticker)}</span>
    </button>
  )
}
