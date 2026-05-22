'use client'

import { track } from '@vercel/analytics'

type AnalyticsValue = string | number | boolean | null | undefined

export type AppEventName =
  | 'album_filter_changed'
  | 'album_search_used'
  | 'album_section_collapsed'
  | 'album_section_expanded'
  | 'album_show_foils_missing'
  | 'album_sticker_toggled'
  | 'album_continue_last_section'
  | 'app_profile_cache_used'
  | 'app_profile_loaded'
  | 'album_startup_loaded'
  | 'album_first_render'
  | 'import_preview_opened'
  | 'import_completed'
  | 'duplicate_added'
  | 'duplicate_removed'
  | 'share_missing_copied'
  | 'scanner_opened'
  | 'scanner_mode_changed'
  | 'scanner_card_status'
  | 'scanner_code_detected'
  | 'scanner_added_to_album'
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'friend_removed'
  | 'friend_album_opened'
  | 'friends_refreshed'
  | 'trade_proposal_created'
  | 'trade_proposal_accepted'
  | 'trade_proposal_declined'
  | 'trade_proposal_cancelled'
  | 'trade_proposal_applied'

export function trackAppEvent(name: AppEventName, properties: Record<string, AnalyticsValue> = {}) {
  if (typeof window === 'undefined') return

  try {
    track(name, properties)
  } catch {
    // Analytics must never block album interactions.
  }
}
