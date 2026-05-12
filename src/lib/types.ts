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
