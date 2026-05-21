export const INITIAL_ALBUM_BLOCK_LIMIT = 8
export const ALBUM_BLOCK_BATCH_SIZE = 8

type AlbumViewFilters = {
  query: string
  filter: string
  sectionFilter: string
  collapseCompleted: boolean
  foilsMissingOnly: boolean
}

export function hasActiveAlbumViewFilters(filters: AlbumViewFilters): boolean {
  return filters.query.trim().length > 0 ||
    filters.filter !== 'all' ||
    filters.sectionFilter !== 'Todas' ||
    filters.collapseCompleted ||
    filters.foilsMissingOnly
}

export function getProgressiveAlbumBlocks<T>(
  blocks: T[],
  options: { hasActiveFilters: boolean; limit: number },
): T[] {
  if (options.hasActiveFilters) return blocks
  return blocks.slice(0, Math.max(0, options.limit))
}

export function getNextAlbumBlockLimit(current: number, total: number): number {
  return Math.min(total, current + ALBUM_BLOCK_BATCH_SIZE)
}
