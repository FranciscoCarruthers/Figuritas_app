import { ALBUM_GROUPS, getTeamStickers } from '@/data/sticker-data'
import { isOwned } from '@/lib/album'
import { getTeamFlagEmoji } from '@/lib/team-flags'
import type { AlbumState, Sticker } from '@/lib/types'

const APP_URL = 'https://figuritasappcarru.vercel.app'

function stickerNumber(sticker: Sticker): string {
  return sticker.code === '00' ? '00' : String(sticker.position)
}

function getMissingNumbers(albumState: AlbumState, stickers: Sticker[]): string[] {
  return stickers.filter(sticker => !isOwned(albumState, sticker.code)).map(stickerNumber)
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

export function buildMissingStickersShareText(albumState: AlbumState): string {
  const lines = ['FiguritasApp - Lista', 'USA Mex Can 26', 'Me faltan']
  const fwcStickers = getTeamStickers('FWC')

  appendMissingLine(
    lines,
    albumState,
    'FWC 🏆',
    fwcStickers.filter(sticker => sticker.position <= 4),
  )
  appendMissingLine(
    lines,
    albumState,
    'FWC 🌎',
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
    'FWC 📜',
    fwcStickers.filter(sticker => sticker.position >= 9),
  )

  if (lines.length === 3) {
    lines.push('Album completo')
  }

  lines.push('', 'Descarga la app', APP_URL)

  return lines.join('\n')
}
