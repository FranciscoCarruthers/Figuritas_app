import type { Sticker, TeamInfo } from '@/lib/types'

export type StickerBlock = {
  id: string
  title: string
  section: string
  stickers: Sticker[]
  teamCode?: string
}

type AlbumGroupLike = {
  label: string
  teams: TeamInfo[]
}

const SOFT_DRINK = String.fromCodePoint(0x1f964)

function blockTitleForTeam(team: TeamInfo): string {
  if (team.code === 'CC') return `${team.code} - ${team.name} ${SOFT_DRINK}`
  return `${team.code} - ${team.name}`
}

export function buildAlbumBlocks(
  albumGroups: AlbumGroupLike[],
  getStickersForTeam: (teamCode: string) => Sticker[],
): StickerBlock[] {
  const blocks: StickerBlock[] = []
  const fwc = getStickersForTeam('FWC')
  const introSection = albumGroups[0]?.label ?? 'Introducción'

  blocks.push({
    id: 'fwc-specials',
    title: 'FWC - Especiales',
    section: introSection,
    stickers: fwc.filter(sticker => sticker.position <= 4),
  })
  blocks.push({
    id: 'fwc-ball-countries',
    title: 'FWC - Balon y Paises',
    section: introSection,
    stickers: fwc.filter(sticker => sticker.position >= 5 && sticker.position <= 8),
  })

  for (const group of albumGroups) {
    for (const team of group.teams) {
      if (team.code === 'FWC') continue
      blocks.push({
        id: team.code,
        title: blockTitleForTeam(team),
        section: group.label,
        stickers: getStickersForTeam(team.code),
        teamCode: team.code,
      })
    }
  }

  blocks.push({
    id: 'fwc-history',
    title: 'FWC - Historia',
    section: introSection,
    stickers: fwc.filter(sticker => sticker.position >= 9),
  })

  return blocks
}
