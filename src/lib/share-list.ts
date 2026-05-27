import { ALBUM_GROUPS, getTeamStickers } from '../data/sticker-data.ts'
import { isOwned } from './album.ts'
import { getTeamFlagEmoji } from './team-flags.ts'
import type { AlbumState, Sticker } from './types.ts'

const APP_URL = 'https://figuritasappcarru.vercel.app'
const TROPHY = String.fromCodePoint(0x1f3c6)
const GLOBE = String.fromCodePoint(0x1f30e)
const SCROLL = String.fromCodePoint(0x1f4dc)

function stickerNumber(sticker: Sticker): string {
  return sticker.code === '00' ? '00' : String(sticker.position)
}

function getMissingNumbers(albumState: AlbumState, stickers: Sticker[]): string[] {
  return stickers.filter(sticker => !isOwned(albumState, sticker.code)).map(stickerNumber)
}

function getDuplicateNumbers(albumState: AlbumState, stickers: Sticker[]): string[] {
  return stickers.flatMap(sticker => {
    const duplicateCount = Math.max(0, (albumState[sticker.code]?.quantity ?? 0) - 1)
    if (duplicateCount === 0) return []

    const number = stickerNumber(sticker)
    return duplicateCount > 1 ? `${number} x${duplicateCount}` : number
  })
}

function appendMissingLine(
  lines: string[],
  albumState: AlbumState,
  label: string,
  stickers: Sticker[],
) {
  const missingNumbers = getMissingNumbers(albumState, stickers)
  if (missingNumbers.length === 0) return
  lines.push(`${label}: ${missingNumbers.join(', ')}`)
}

function appendDuplicateLine(
  lines: string[],
  albumState: AlbumState,
  label: string,
  stickers: Sticker[],
) {
  const duplicateNumbers = getDuplicateNumbers(albumState, stickers)
  if (duplicateNumbers.length === 0) return
  lines.push(`${label}: ${duplicateNumbers.join(', ')}`)
}

export function buildMissingStickersShareText(albumState: AlbumState): string {
  const lines = ['FiguritasApp - Lista', 'USA Mex Can 26', 'Me faltan']
  const fwcStickers = getTeamStickers('FWC')

  appendMissingLine(
    lines,
    albumState,
    `FWC ${TROPHY}`,
    fwcStickers.filter(sticker => sticker.position <= 4),
  )
  appendMissingLine(
    lines,
    albumState,
    `FWC ${GLOBE}`,
    fwcStickers.filter(sticker => sticker.position >= 5 && sticker.position <= 8),
  )

  for (const group of ALBUM_GROUPS) {
    for (const team of group.teams) {
      if (team.code === 'FWC') continue
      const flag = getTeamFlagEmoji(team.code)
      appendMissingLine(lines, albumState, `${team.code}${flag ? ` ${flag}` : ''}`, getTeamStickers(team.code))
    }
  }

  appendMissingLine(
    lines,
    albumState,
    `FWC ${SCROLL}`,
    fwcStickers.filter(sticker => sticker.position >= 9),
  )

  if (lines.length === 3) {
    lines.push('Album completo')
  }

  lines.push('', 'Descarga la app', APP_URL)

  return lines.join('\n')
}

export function buildDuplicateStickersShareText(albumState: AlbumState): string {
  const lines = ['FiguritasApp - Lista', 'USA Mex Can 26', 'Repetidas']
  const fwcStickers = getTeamStickers('FWC')

  appendDuplicateLine(
    lines,
    albumState,
    `FWC ${TROPHY}`,
    fwcStickers.filter(sticker => sticker.position <= 4),
  )
  appendDuplicateLine(
    lines,
    albumState,
    `FWC ${GLOBE}`,
    fwcStickers.filter(sticker => sticker.position >= 5 && sticker.position <= 8),
  )

  for (const group of ALBUM_GROUPS) {
    for (const team of group.teams) {
      if (team.code === 'FWC') continue
      const flag = getTeamFlagEmoji(team.code)
      appendDuplicateLine(lines, albumState, `${team.code}${flag ? ` ${flag}` : ''}`, getTeamStickers(team.code))
    }
  }

  appendDuplicateLine(
    lines,
    albumState,
    `FWC ${SCROLL}`,
    fwcStickers.filter(sticker => sticker.position >= 9),
  )

  if (lines.length === 3) {
    lines.push('No tengo repetidas')
  }

  lines.push('', 'Descarga la app', APP_URL)

  return lines.join('\n')
}
