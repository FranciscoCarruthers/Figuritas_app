import type { ActivityEntry, AlbumState, Sticker, TeamInfo } from '@/lib/types'

export type StatsTeamProgress = {
  code: string
  name: string
  owned: number
  total: number
  missing: number
  percent: number
}

export type StatsGroupProgress = {
  label: string
  owned: number
  total: number
  missing: number
  percent: number
}

export type StatsRecommendation = {
  kind: 'almost-team' | 'missing-foils' | 'next-group' | 'complete'
  title: string
  detail: string
  code?: string
}

export type StatsActivityInput = Pick<ActivityEntry, 'quantity' | 'created_at'>

export type AlbumInsights = {
  progress: {
    owned: number
    total: number
    missing: number
    percent: number
  }
  completedTeams: number
  completedSections: number
  foils: {
    owned: number
    total: number
    missing: number
    percent: number
  }
  closestTeams: StatsTeamProgress[]
  groupProgress: StatsGroupProgress[]
  weeklyActivity: {
    total: number
    marked: number
    unmarked: number
  }
  recommendations: StatsRecommendation[]
}

type AlbumGroupInput = {
  label: string
  teams: TeamInfo[]
}

function percent(owned: number, total: number): number {
  return total === 0 ? 0 : Math.round((owned / total) * 100)
}

function isOwned(albumState: AlbumState, code: string): boolean {
  return (albumState[code]?.quantity ?? 0) > 0
}

function progressForStickers(stickers: Sticker[], albumState: AlbumState) {
  const total = stickers.length
  const owned = stickers.filter(sticker => isOwned(albumState, sticker.code)).length
  return { owned, total, missing: total - owned, percent: percent(owned, total) }
}

function getTeamProgress(
  stickers: Sticker[],
  teams: TeamInfo[],
  albumState: AlbumState,
): StatsTeamProgress[] {
  return teams.map(team => ({
    code: team.code,
    name: team.name,
    ...progressForStickers(stickers.filter(sticker => sticker.teamCode === team.code), albumState),
  }))
}

function getGroupStickers(stickers: Sticker[], group: AlbumGroupInput): Sticker[] {
  const teamCodes = new Set(group.teams.map(team => team.code))
  return stickers.filter(sticker => teamCodes.has(sticker.teamCode))
}

function buildRecommendations(
  closestTeams: StatsTeamProgress[],
  groupProgress: StatsGroupProgress[],
  foilMissing: number,
): StatsRecommendation[] {
  const recommendations: StatsRecommendation[] = []
  const almostTeam = closestTeams[0]
  const nextGroup = groupProgress
    .filter(group => group.missing > 0)
    .sort((a, b) => a.missing - b.missing || b.percent - a.percent)[0]

  if (almostTeam) {
    recommendations.push({
      kind: 'almost-team',
      code: almostTeam.code,
      title: `${almostTeam.code} esta cerca`,
      detail: `Faltan ${almostTeam.missing} para completar ${almostTeam.name}.`,
    })
  }

  if (foilMissing > 0) {
    recommendations.push({
      kind: 'missing-foils',
      title: 'Brillantes pendientes',
      detail: `Todavia faltan ${foilMissing} brillantes.`,
    })
  }

  if (nextGroup) {
    recommendations.push({
      kind: 'next-group',
      title: `${nextGroup.label} es buen objetivo`,
      detail: `Faltan ${nextGroup.missing} figuritas para cerrar esa seccion.`,
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      kind: 'complete',
      title: 'Album completo',
      detail: 'No quedan figuritas pendientes.',
    })
  }

  return recommendations.slice(0, 3)
}

export function buildAlbumInsights(
  stickers: Sticker[],
  groups: AlbumGroupInput[],
  albumState: AlbumState,
  weeklyEntries: StatsActivityInput[] = [],
): AlbumInsights {
  const teams = groups.flatMap(group => group.teams).filter(team => team.code !== 'FWC')
  const teamProgress = getTeamProgress(stickers, teams, albumState)
  const completedTeams = teamProgress.filter(team => team.total > 0 && team.missing === 0).length
  const groupProgress = groups.map(group => ({
    label: group.label,
    ...progressForStickers(getGroupStickers(stickers, group), albumState),
  }))
  const foils = progressForStickers(stickers.filter(sticker => sticker.isFoil), albumState)
  const closestTeams = teamProgress
    .filter(team => team.total > 0 && team.missing > 0)
    .sort((a, b) => a.missing - b.missing || b.percent - a.percent || a.code.localeCompare(b.code))
    .slice(0, 5)

  return {
    progress: progressForStickers(stickers, albumState),
    completedTeams,
    completedSections: groupProgress.filter(group => group.total > 0 && group.missing === 0).length,
    foils,
    closestTeams,
    groupProgress,
    weeklyActivity: {
      total: weeklyEntries.length,
      marked: weeklyEntries.filter(entry => entry.quantity > 0).length,
      unmarked: weeklyEntries.filter(entry => entry.quantity === 0).length,
    },
    recommendations: buildRecommendations(closestTeams, groupProgress, foils.missing),
  }
}
