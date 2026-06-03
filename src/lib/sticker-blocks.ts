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
const BONUS_TEAM_CODE = 'CC'

function blockTitleForTeam(team: TeamInfo): string {
  if (team.code === BONUS_TEAM_CODE) return `${team.code} - ${team.name} ${SOFT_DRINK}`
  return `${team.code} - ${team.name}`
}

export function buildAlbumBlocks(
  albumGroups: AlbumGroupLike[],
  getStickersForTeam: (teamCode: string) => Sticker[],
): StickerBlock[] {
  const blocks: StickerBlock[] = []
  const bonusBlocks: StickerBlock[] = []
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
      const block = {
        id: team.code,
        title: blockTitleForTeam(team),
        section: group.label,
        stickers: getStickersForTeam(team.code),
        teamCode: team.code,
      }
      if (team.code === BONUS_TEAM_CODE) {
        bonusBlocks.push(block)
      } else {
        blocks.push(block)
      }
    }
  }

  blocks.push({
    id: 'fwc-history',
    title: 'FWC - Historia',
    section: introSection,
    stickers: fwc.filter(sticker => sticker.position >= 9),
  })
  blocks.push(...bonusBlocks)

  return blocks
}
