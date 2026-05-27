import type { TradeProposal } from '@/lib/types'

type TradeStatusInfo = Pick<TradeProposal, 'status' | 'direction' | 'my_applied' | 'friend_applied'>

export function getTradeStatusLabel(trade: TradeStatusInfo): string {
  if (trade.status === 'pending' && trade.direction === 'incoming') return 'Te propusieron'
  if (trade.status === 'pending') return 'Esperando respuesta'
  if (trade.status === 'accepted' && trade.my_applied && !trade.friend_applied) return 'Esperando que el otro lo anote'
  if (trade.status === 'accepted' && !trade.my_applied) return 'Listo para anotar'
  if (trade.status === 'accepted') return 'Intercambio exitoso'
  if (trade.status === 'completed') return 'Completado'
  if (trade.status === 'declined') return 'Rechazado'
  return 'Cancelado'
}

export function canCancelTradeProposal(trade: TradeStatusInfo): boolean {
  if (trade.status === 'pending') return trade.direction === 'outgoing'
  return trade.status === 'accepted' && !trade.my_applied && !trade.friend_applied
}

export function shouldShowTradeProposal(trade: TradeStatusInfo): boolean {
  return trade.status !== 'cancelled' && trade.status !== 'declined'
}
