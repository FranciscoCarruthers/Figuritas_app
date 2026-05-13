import type { AlbumState, Sticker } from '@/lib/types'

export function getQuantity(state: AlbumState, code: string): number {
  return state[code]?.quantity ?? 0
}

export function isOwned(state: AlbumState, code: string): boolean {
  return getQuantity(state, code) > 0
}

export function getProgress(state: AlbumState, stickers: Sticker[]) {
  const total = stickers.length
  const owned = stickers.filter(sticker => isOwned(state, sticker.code)).length
  const percent = total === 0 ? 0 : Math.round((owned / total) * 100)

  return { total, owned, missing: total - owned, percent }
}
