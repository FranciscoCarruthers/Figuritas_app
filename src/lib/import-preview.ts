import type { AlbumState, Sticker } from '@/lib/types'

export type ImportPreview = {
  total: number
  ownedAfter: number
  missingAfter: number
  unchanged: number
  changesToOwned: number
  changesToMissing: number
  totalChanges: number
}

export function buildImportPreview(
  stickers: Sticker[],
  albumState: AlbumState,
  missingCodes: Set<string>,
): ImportPreview {
  let ownedAfter = 0
  let missingAfter = 0
  let unchanged = 0
  let changesToOwned = 0
  let changesToMissing = 0

  for (const sticker of stickers) {
    const currentOwned = (albumState[sticker.code]?.quantity ?? 0) > 0
    const nextOwned = !missingCodes.has(sticker.code)

    if (nextOwned) {
      ownedAfter += 1
    } else {
      missingAfter += 1
    }

    if (currentOwned === nextOwned) {
      unchanged += 1
    } else if (nextOwned) {
      changesToOwned += 1
    } else {
      changesToMissing += 1
    }
  }

  return {
    total: stickers.length,
    ownedAfter,
    missingAfter,
    unchanged,
    changesToOwned,
    changesToMissing,
    totalChanges: changesToOwned + changesToMissing,
  }
}
