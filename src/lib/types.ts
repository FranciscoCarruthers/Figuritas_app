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

export interface DuplicateSummary {
  sticker: Sticker
  quantity: number
  available: number
  isFormation: boolean
}

export interface TradeRuleSet {
  sameQuantity: boolean
  sameFoils: boolean
  sameFormations: boolean
}

export interface TradeSuggestion {
  mineUseful: DuplicateSummary[]
  friendUseful: DuplicateSummary[]
}

export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'

export interface TradeProposalItem {
  sticker_code: string
  sticker_name: string
  sticker_team: string
  is_foil: boolean
  position: number
  quantity: number
  owner_is_me: boolean
  receiver_is_me: boolean
}

export interface TradeProposal {
  id: string
  friend_username: string
  direction: 'incoming' | 'outgoing'
  status: TradeStatus
  same_quantity: boolean
  same_foils: boolean
  same_formations: boolean
  my_applied: boolean
  friend_applied: boolean
  created_at: string
  updated_at: string
  responded_at: string | null
  items: TradeProposalItem[]
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  device_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  notify_trades: boolean
  notify_sticker_updates: boolean
  enabled: boolean
  created_at: string
  updated_at: string
  last_seen_at: string
}
