import type { AlbumState, FriendAlbumSticker, FriendSummary } from '@/lib/types'

type ProgressSummary = {
  total: number
  owned: number
  missing: number
  percent: number
}

export function buildFriendAlbumState(rows: Pick<FriendAlbumSticker, 'sticker_code' | 'quantity' | 'updated_at'>[]): AlbumState {
  const state: AlbumState = {}

  for (const row of rows) {
    if (row.quantity <= 0) continue
    state[row.sticker_code] = {
      sticker_code: row.sticker_code,
      quantity: row.quantity,
      updated_by: null,
      updated_at: row.updated_at ?? new Date(0).toISOString(),
    }
  }

  return state
}

export function getAlbumLastUpdatedAt(state: AlbumState): string | null {
  return Object.values(state)
    .map(sticker => sticker.updated_at)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null
}

export function buildSelfFriendSummary(
  username: string | null | undefined,
  state: AlbumState,
  progress: ProgressSummary,
): FriendSummary | null {
  if (!username) return null

  const lastUpdatedAt = getAlbumLastUpdatedAt(state)
  const fallbackDate = lastUpdatedAt ?? new Date(0).toISOString()

  return {
    friendship_id: 'self',
    username,
    status: 'accepted',
    direction: 'accepted',
    owned_count: progress.owned,
    missing_count: progress.missing,
    total_count: progress.total,
    percent: progress.percent,
    last_updated_at: lastUpdatedAt,
    requested_at: fallbackDate,
    responded_at: null,
    updated_at: fallbackDate,
  }
}

export function isSelfFriendSummary(friend: Pick<FriendSummary, 'friendship_id'>): boolean {
  return friend.friendship_id === 'self'
}

export function formatFriendLastUpdate(value: string | null, now = new Date()): string {
  if (!value) return 'sin movimientos'

  const diff = now.getTime() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  return `hace ${Math.floor(hours / 24)} d`
}

export function sortFriendRanking<T extends Pick<FriendSummary, 'status' | 'missing_count' | 'percent' | 'username'>>(friends: T[]): T[] {
  return friends
    .filter(friend => friend.status === 'accepted')
    .sort((left, right) => {
      const leftMissing = left.missing_count ?? Number.POSITIVE_INFINITY
      const rightMissing = right.missing_count ?? Number.POSITIVE_INFINITY
      return leftMissing - rightMissing ||
        (right.percent ?? 0) - (left.percent ?? 0) ||
        left.username.localeCompare(right.username)
    })
}

export function getAcceptedFriends(friends: FriendSummary[]): FriendSummary[] {
  return friends.filter(friend => friend.status === 'accepted')
}

export function getIncomingFriendRequests(friends: FriendSummary[]): FriendSummary[] {
  return friends.filter(friend => friend.status === 'pending' && friend.direction === 'incoming')
}

export function getOutgoingFriendRequests(friends: FriendSummary[]): FriendSummary[] {
  return friends.filter(friend => friend.status === 'pending' && friend.direction === 'outgoing')
}
