import type { AlbumState, UserProfile } from '@/lib/types'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type CachedProfilePayload = {
  version: number
  userId: string
  profile: UserProfile
  savedAt: string
}

type CachedAlbumPayload = {
  version: number
  albumId: string
  albumState: AlbumState
  savedAt: string
}

export const LOCAL_CACHE_VERSION = 1
const CACHE_PREFIX = `figuritasapp:v${LOCAL_CACHE_VERSION}`

export function getProfileCacheKey(userId: string): string {
  return `${CACHE_PREFIX}:profile:${userId}`
}

export function getAlbumCacheKey(albumId: string): string {
  return `${CACHE_PREFIX}:album:${albumId}`
}

function safeParse(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function isProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<UserProfile>
  return typeof profile.user_id === 'string' &&
    typeof profile.username === 'string' &&
    typeof profile.album_id === 'string'
}

function isAlbumState(value: unknown): value is AlbumState {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function readCachedProfile(storage: StorageLike, userId: string): { profile: UserProfile; savedAt: string } | null {
  const payload = safeParse(storage.getItem(getProfileCacheKey(userId))) as Partial<CachedProfilePayload> | null
  if (!payload || payload.version !== LOCAL_CACHE_VERSION) return null
  if (payload.userId !== userId || typeof payload.savedAt !== 'string' || !isProfile(payload.profile)) return null
  return { profile: payload.profile, savedAt: payload.savedAt }
}

export function writeCachedProfile(
  storage: StorageLike,
  userId: string,
  profile: UserProfile,
  savedAt = new Date().toISOString(),
): void {
  try {
    const payload: CachedProfilePayload = {
      version: LOCAL_CACHE_VERSION,
      userId,
      profile,
      savedAt,
    }
    storage.setItem(getProfileCacheKey(userId), JSON.stringify(payload))
  } catch {
    // Storage is a performance enhancement only.
  }
}

export function clearCachedProfile(storage: StorageLike, userId: string): void {
  try {
    storage.removeItem(getProfileCacheKey(userId))
  } catch {
    // Storage is a performance enhancement only.
  }
}

export function readCachedAlbum(storage: StorageLike, albumId: string): { albumState: AlbumState; savedAt: string } | null {
  const payload = safeParse(storage.getItem(getAlbumCacheKey(albumId))) as Partial<CachedAlbumPayload> | null
  if (!payload || payload.version !== LOCAL_CACHE_VERSION) return null
  if (payload.albumId !== albumId || typeof payload.savedAt !== 'string' || !isAlbumState(payload.albumState)) return null
  return { albumState: payload.albumState, savedAt: payload.savedAt }
}

export function writeCachedAlbum(
  storage: StorageLike,
  albumId: string,
  albumState: AlbumState,
  savedAt = new Date().toISOString(),
): void {
  try {
    const payload: CachedAlbumPayload = {
      version: LOCAL_CACHE_VERSION,
      albumId,
      albumState,
      savedAt,
    }
    storage.setItem(getAlbumCacheKey(albumId), JSON.stringify(payload))
  } catch {
    // Storage is a performance enhancement only.
  }
}

export function clearCachedAlbum(storage: StorageLike, albumId: string): void {
  try {
    storage.removeItem(getAlbumCacheKey(albumId))
  } catch {
    // Storage is a performance enhancement only.
  }
}
