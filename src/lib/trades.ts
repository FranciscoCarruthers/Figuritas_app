import type { AlbumState, DuplicateSummary, Sticker, TradeRuleSet, TradeSuggestion } from '@/lib/types'

export type TradeSelectionItem = {
  sticker: Sticker
  quantity: number
}

export function getDuplicateCount(state: AlbumState, code: string): number {
  return Math.max(0, (state[code]?.quantity ?? 0) - 1)
}

export function getNextDuplicateQuantity(currentQuantity: number, delta: number): number {
  if (delta > 0) return Math.min(99, Math.max(1, currentQuantity) + delta)
  return Math.max(1, currentQuantity - 1)
}

export function isFormationSticker(sticker: Pick<Sticker, 'teamCode' | 'position'>): boolean {
  return sticker.teamCode !== 'FWC' && sticker.position === 13
}

function stateOwnsSticker(state: AlbumState, code: string): boolean {
  return (state[code]?.quantity ?? 0) > 0
}

export function getDuplicateSummaries(stickers: Sticker[], state: AlbumState): DuplicateSummary[] {
  return stickers
    .map(sticker => {
      const quantity = state[sticker.code]?.quantity ?? 0
      return {
        sticker,
        quantity,
        available: getDuplicateCount(state, sticker.code),
        isFormation: isFormationSticker(sticker),
      }
    })
    .filter(item => item.available > 0)
}

export function buildTradeSuggestions(
  myState: AlbumState,
  friendState: AlbumState,
  stickers: Sticker[],
): TradeSuggestion {
  const mineUseful = getDuplicateSummaries(stickers, myState)
    .filter(item => !stateOwnsSticker(friendState, item.sticker.code))
  const friendUseful = getDuplicateSummaries(stickers, friendState)
    .filter(item => !stateOwnsSticker(myState, item.sticker.code))

  return { mineUseful, friendUseful }
}

function countItems(items: TradeSelectionItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0)
}

function countFoils(items: TradeSelectionItem[]): number {
  return items.reduce((total, item) => total + (item.sticker.isFoil ? item.quantity : 0), 0)
}

function countFormations(items: TradeSelectionItem[]): number {
  return items.reduce((total, item) => total + (isFormationSticker(item.sticker) ? item.quantity : 0), 0)
}

export function validateTradeRules(
  mine: Array<{ sticker?: Sticker; quantity: number }>,
  theirs: Array<{ sticker?: Sticker; quantity: number }>,
  rules: TradeRuleSet,
): { valid: boolean; messages: string[] } {
  const myItems = mine.filter((item): item is TradeSelectionItem => Boolean(item.sticker) && item.quantity > 0)
  const theirItems = theirs.filter((item): item is TradeSelectionItem => Boolean(item.sticker) && item.quantity > 0)
  const messages: string[] = []

  if (myItems.length === 0 || theirItems.length === 0) {
    messages.push('Elegí al menos una figurita de cada lado.')
  }
  if (rules.sameQuantity && countItems(myItems) !== countItems(theirItems)) {
    messages.push('La cantidad total de figuritas tiene que coincidir.')
  }
  if (rules.sameFoils && countFoils(myItems) !== countFoils(theirItems)) {
    messages.push('La cantidad de brillantes tiene que coincidir.')
  }
  if (rules.sameFormations && countFormations(myItems) !== countFormations(theirItems)) {
    messages.push('La cantidad de formaciones tiene que coincidir.')
  }

  return { valid: messages.length === 0, messages }
}

export function summarizeTradeSelection(items: TradeSelectionItem[]) {
  return {
    total: countItems(items),
    foils: countFoils(items),
    formations: countFormations(items),
  }
}
