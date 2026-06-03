import type { AlbumState, Sticker } from '@/lib/types'

export function getQuantity(state: AlbumState, code: string): number {
  return state[code]?.quantity ?? 0
}

export function isOwned(state: AlbumState, code: string): boolean {
  return getQuantity(state, code) > 0
}

export function getCompletionPercent(owned: number, total: number): number {
  if (total === 0) return 0
  if (owned >= total) return 100
  return Math.floor((owned / total) * 100)
}

export function getProgress(state: AlbumState, stickers: Sticker[]) {
  const total = stickers.length
  const owned = stickers.filter(sticker => isOwned(state, sticker.code)).length
  const percent = getCompletionPercent(owned, total)

  return { total, owned, missing: total - owned, percent }
}
