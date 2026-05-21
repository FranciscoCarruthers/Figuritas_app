export type StickerType = 'logo' | 'photo' | 'player' | 'intro'

export interface Sticker {
  code: string
  name: string
  team: string
  teamCode: string
  type: StickerType
  isFoil: boolean
  position: number
}

export interface TeamInfo {
  code: string
  name: string
}

export interface AlbumSticker {
  sticker_code: string
  quantity: number
  updated_by: string | null
  updated_at: string
}

export type AlbumState = Record<string, AlbumSticker>

export interface UserProfile {
  user_id: string
  username: string
  album_id: string
}

export interface ActivityEntry {
  id: number
  album_id: string
  sticker_code: string
  sticker_name: string
  sticker_team: string
  user_name: string
  action: string
  quantity: number
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined'

export type FriendDirection = 'incoming' | 'outgoing' | 'accepted' | 'declined'

export interface FriendSummary {
  friendship_id: string
  username: string
  status: FriendshipStatus
  direction: FriendDirection
  owned_count: number | null
  missing_count: number | null
  total_count: number | null
  percent: number | null
  last_updated_at: string | null
  requested_at: string
  responded_at: string | null
  updated_at: string
}

export interface FriendAlbumSticker {
  username: string
  sticker_code: string
  quantity: number
  updated_at: string | null
  last_updated_at: string | null
}

export type FriendAlbumState = AlbumState
