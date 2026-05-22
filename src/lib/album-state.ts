import type { AlbumState, AlbumSticker } from '@/lib/types'

export function albumRowsToState(rows: Array<Pick<AlbumSticker, 'sticker_code' | 'quantity' | 'updated_by' | 'updated_at'>>): AlbumState {
  const nextState: AlbumState = {}
  for (const row of rows) {
    nextState[row.sticker_code] = row as AlbumSticker
  }
  return nextState
}
