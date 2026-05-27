'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Clock3, Handshake, Loader2, RefreshCw, Trash2, Trophy, UserPlus, Users, X } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import { useAlbum } from '@/context/AlbumContext'
import { useAuth } from '@/context/AuthContext'
import { STICKERS } from '@/data/sticker-data'
import { trackAppEvent } from '@/lib/app-analytics'
import { getProgress } from '@/lib/album'
import { notifyTradeEvent } from '@/lib/push-client'
import { canCancelTradeProposal, getTradeStatusLabel, shouldShowTradeProposal } from '@/lib/trade-display'
import {
  buildSelfFriendSummary,
  formatFriendLastUpdate,
  getAcceptedFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  isSelfFriendSummary,
  sortFriendRanking,
} from '@/lib/friends'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { FriendSummary, TradeProposal } from '@/lib/types'

function asFriends(data: unknown): FriendSummary[] {
  return (Array.isArray(data) ? data : []) as FriendSummary[]
}

function asTradeProposals(data: unknown): TradeProposal[] {
  return ((Array.isArray(data) ? data : []) as TradeProposal[]).filter(shouldShowTradeProposal)
}

function isMissingTradeRpcError(message: string): boolean {
  return message.includes('get_trade_proposals') && (
    message.includes('Could not find the function') ||
    message.includes('does not exist')
  )
}

function metric(value: number | null): string {
  return value === null ? '-' : String(value)
}

function FriendCard({ friend, onRemove }: { friend: FriendSummary; onRemove: (friend: FriendSummary) => void }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black tracking-tight text-slate-950">{friend.username}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            {formatFriendLastUpdate(friend.last_updated_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(friend)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          aria-label={`Quitar a ${friend.username}`}
          title={`Quitar a ${friend.username}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-600">
          <span>{metric(friend.owned_count)}/{metric(friend.total_count)} tiene</span>
          <span>{metric(friend.percent)}%</span>
        </div>
        <ProgressBar value={friend.percent ?? 0} color="#b91c1c" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-2xl font-black text-slate-950">{metric(friend.owned_count)}</p>
          <p className="text-xs font-bold text-slate-500">tiene</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-2xl font-black text-red-700">{metric(friend.missing_count)}</p>
          <p className="text-xs font-bold text-red-700">faltan</p>
        </div>
      </div>

      <Link
        href={`/amigos/${encodeURIComponent(friend.username)}`}
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-black text-white active:bg-red-800"
      >
        Ver album
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href={`/amigos/${encodeURIComponent(friend.username)}/intercambiar`}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white active:bg-slate-800"
      >
        Intercambiar
        <Handshake className="h-4 w-4" />
      </Link>
    </article>
  )
}

function TradeProposalCard({
  trade,
  busy,
  onAccept,
  onDecline,
  onCancel,
  onApply,
}: {
  trade: TradeProposal
  busy: boolean
  onAccept: (trade: TradeProposal) => void
  onDecline: (trade: TradeProposal) => void
  onCancel: (trade: TradeProposal) => void
  onApply: (trade: TradeProposal) => void
}) {
  const mine = trade.items.filter(item => item.owner_is_me)
  const theirs = trade.items.filter(item => item.receiver_is_me)
  const mineTotal = mine.reduce((total, item) => total + item.quantity, 0)
  const theirTotal = theirs.reduce((total, item) => total + item.quantity, 0)
  const canCancel = canCancelTradeProposal(trade)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-red-700">{getTradeStatusLabel(trade)}</p>
          <h3 className="mt-1 truncate text-xl font-black text-slate-950">{trade.friend_username}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {mineTotal} x {theirTotal}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Das</p>
          <p className="mt-1 line-clamp-2">
            {mine.length > 0 ? mine.map(item => `${item.sticker_code}${item.quantity > 1 ? ` x${item.quantity}` : ''}`).join(', ') : '-'}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-red-700">Recibis</p>
          <p className="mt-1 line-clamp-2 text-red-800">
            {theirs.length > 0 ? theirs.map(item => `${item.sticker_code}${item.quantity > 1 ? ` x${item.quantity}` : ''}`).join(', ') : '-'}
          </p>
        </div>
      </div>

      {trade.status === 'pending' && trade.direction === 'incoming' ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAccept(trade)}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 text-sm font-black text-white disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Aceptar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecline(trade)}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Rechazar
          </button>
        </div>
      ) : null}

      {trade.status === 'pending' && trade.direction === 'outgoing' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(trade)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-600 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancelar propuesta
        </button>
      ) : null}

      {trade.status === 'accepted' ? (
        <div className={`mt-4 grid gap-2 ${canCancel ? 'sm:grid-cols-2' : ''}`}>
          <button
            type="button"
            disabled={busy || trade.my_applied}
            onClick={() => onApply(trade)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-700 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Check className="h-4 w-4" />
            {trade.my_applied ? 'Ya lo anotaste' : 'Anotar en mi album'}
          </button>
          {canCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(trade)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-600 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancelar intercambio
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export default function AmigosPage() {
  const { profile, session } = useAuth()
  const { albumState, isLoading: albumLoading, refreshAlbum } = useAlbum()
  const [friends, setFriends] = useState<FriendSummary[]>([])
  const [trades, setTrades] = useState<TradeProposal[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [tradesLoading, setTradesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tradeBusyId, setTradeBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [tradeError, setTradeError] = useState('')
  const [message, setMessage] = useState('')

  const acceptedFriends = useMemo(() => getAcceptedFriends(friends), [friends])
  const incomingRequests = useMemo(() => getIncomingFriendRequests(friends), [friends])
  const outgoingRequests = useMemo(() => getOutgoingFriendRequests(friends), [friends])
  const ownProgress = useMemo(() => getProgress(albumState, STICKERS), [albumState])
  const ownRankingEntry = useMemo(
    () => albumLoading ? null : buildSelfFriendSummary(profile?.username, albumState, ownProgress),
    [albumLoading, albumState, ownProgress, profile?.username],
  )
  const ranking = useMemo(
    () => sortFriendRanking(ownRankingEntry ? [ownRankingEntry, ...friends] : friends),
    [friends, ownRankingEntry],
  )

  const loadTrades = useCallback(async (trackRefresh = false) => {
    const supabase = getSupabaseBrowserClient()
    setTradesLoading(true)
    setTradeError('')
    const { data, error: rpcError } = await supabase.rpc('get_trade_proposals')
    if (rpcError) {
      setTrades([])
      setTradeError(isMissingTradeRpcError(rpcError.message) ? '' : rpcError.message)
    } else {
      setTrades(asTradeProposals(data))
      if (trackRefresh) trackAppEvent('friends_refreshed', { scope: 'trades' })
    }
    setTradesLoading(false)
  }, [])

  const loadFriends = useCallback(async (trackRefresh = false) => {
    const supabase = getSupabaseBrowserClient()
    setLoading(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('get_friend_summaries')
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setFriends(asFriends(data))
      if (trackRefresh) trackAppEvent('friends_refreshed')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadFriends()
    void loadTrades()
  }, [loadFriends, loadTrades])

  async function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextUsername = username.trim().toLowerCase()
    if (!nextUsername) return

    setSubmitting(true)
    setError('')
    setMessage('')
    const supabase = getSupabaseBrowserClient()
    const { error: rpcError } = await supabase.rpc('send_friend_request', { p_username: nextUsername })
    if (rpcError) {
      setError(rpcError.message)
    } else {
      trackAppEvent('friend_request_sent', { username: nextUsername })
      setMessage(`Solicitud enviada a ${nextUsername}.`)
      setUsername('')
      await loadFriends()
    }
    setSubmitting(false)
  }

  async function respond(friend: FriendSummary, accept: boolean) {
    setError('')
    setMessage('')
    const supabase = getSupabaseBrowserClient()
    const { error: rpcError } = await supabase.rpc('respond_friend_request', {
      p_friendship_id: friend.friendship_id,
      p_accept: accept,
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }

    if (accept) trackAppEvent('friend_request_accepted', { username: friend.username })
    setMessage(accept ? `${friend.username} ya es tu amigo.` : `Solicitud de ${friend.username} rechazada.`)
    await loadFriends()
  }

  async function removeFriend(friend: FriendSummary) {
    if (!window.confirm(`Quitar a ${friend.username} de tus amigos?`)) return

    setError('')
    setMessage('')
    const supabase = getSupabaseBrowserClient()
    const { error: rpcError } = await supabase.rpc('remove_friend', { p_friendship_id: friend.friendship_id })
    if (rpcError) {
      setError(rpcError.message)
      return
    }

    trackAppEvent('friend_removed', { username: friend.username })
    setMessage(`${friend.username} fue quitado de tus amigos.`)
    await loadFriends()
  }

  async function respondTrade(trade: TradeProposal, accept: boolean) {
    setTradeBusyId(trade.id)
    setTradeError('')
    setMessage('')
    const supabase = getSupabaseBrowserClient()
    const { error: rpcError } = await supabase.rpc('respond_trade_proposal', {
      p_proposal_id: trade.id,
      p_accept: accept,
    })
    if (rpcError) {
      setTradeError(rpcError.message)
    } else {
      trackAppEvent(accept ? 'trade_proposal_accepted' : 'trade_proposal_declined', {
        friend: trade.friend_username,
      })
      void notifyTradeEvent(session, { proposalId: trade.id, action: accept ? 'accepted' : 'declined' })
      setMessage(accept ? 'Intercambio aceptado.' : 'Intercambio rechazado.')
      await loadTrades()
    }
    setTradeBusyId(null)
  }

  async function cancelTrade(trade: TradeProposal) {
    if (trade.status === 'accepted' && !window.confirm('Cancelar este intercambio aceptado? No se va a anotar en ningun album.')) return

    setTradeBusyId(trade.id)
    setTradeError('')
    setMessage('')
    const supabase = getSupabaseBrowserClient()
    const { error: rpcError } = await supabase.rpc('cancel_trade_proposal', {
      p_proposal_id: trade.id,
    })
    if (rpcError) {
      setTradeError(rpcError.message)
    } else {
      trackAppEvent('trade_proposal_cancelled', { friend: trade.friend_username })
      void notifyTradeEvent(session, { proposalId: trade.id, action: 'cancelled' })
      setTrades(currentTrades => currentTrades.filter(currentTrade => currentTrade.id !== trade.id))
      setMessage('Intercambio cancelado.')
      await loadTrades()
    }
    setTradeBusyId(null)
  }

  async function applyTrade(trade: TradeProposal) {
    setTradeBusyId(trade.id)
    setTradeError('')
    setMessage('')
    const supabase = getSupabaseBrowserClient()
    const { error: rpcError } = await supabase.rpc('apply_trade_proposal', {
      p_proposal_id: trade.id,
    })
    if (rpcError) {
      setTradeError(rpcError.message)
    } else {
      trackAppEvent('trade_proposal_applied', { friend: trade.friend_username })
      void notifyTradeEvent(session, { proposalId: trade.id, action: 'applied' })
      try {
        await refreshAlbum()
      } catch {
        setTradeError('El intercambio se anoto, pero no pude refrescar el album. Toca refrescar o volve a abrir la app.')
      }
      setMessage('Intercambio anotado en tu album.')
      await loadTrades()
      await loadFriends()
    }
    setTradeBusyId(null)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 lg:px-8 lg:pb-8">
      <header className="safe-top pb-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.08em] text-red-700">FiguritasApp</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Amigos</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Compara albumes y mira si estan actualizados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadFriends(true)
              void loadTrades(true)
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 active:bg-slate-100"
            aria-label="Refrescar amigos"
            title="Refrescar amigos"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-950">Agregar amigo</h2>
            <p className="mt-0.5 text-sm font-semibold text-slate-500">
              Escribi el usuario. Va a poder ver tu album solo si acepta la solicitud.
            </p>
          </div>
        </div>
        <form onSubmit={sendRequest} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={username}
            onChange={event => setUsername(event.target.value)}
            placeholder="usuario"
            autoCapitalize="none"
            autoComplete="off"
            className="h-12 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition focus:border-red-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={submitting || !username.trim()}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Enviar
          </button>
        </form>
        {profile?.username && (
          <p className="mt-3 text-xs font-bold text-slate-400">Tu usuario: {profile.username}</p>
        )}
      </section>

      {error && (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
      )}
      {message && (
        <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p>
      )}
      {tradeError && (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{tradeError}</p>
      )}

      {loading ? (
        <section className="mt-5 grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </section>
      ) : (
        <>
          {incomingRequests.length > 0 && (
            <section className="mt-5">
              <h2 className="mb-3 text-xl font-black tracking-tight text-slate-950">Solicitudes recibidas</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {incomingRequests.map(friend => (
                  <article key={friend.friendship_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-lg font-black text-slate-950">{friend.username}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Quiere compartir su album con vos.</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void respond(friend, true)}
                        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-red-700 text-sm font-black text-white active:bg-red-800"
                      >
                        <Check className="h-4 w-4" />
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => void respond(friend, false)}
                        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 text-sm font-black text-slate-600 active:bg-slate-200"
                      >
                        <X className="h-4 w-4" />
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {(tradesLoading || trades.length > 0) && (
            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950">Intercambios</h2>
                  <p className="text-sm font-semibold text-slate-500">Propuestas pendientes y aceptadas.</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-700">
                  <Handshake className="h-5 w-5" />
                </span>
              </div>
              {tradesLoading ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-44 animate-pulse rounded-xl bg-white shadow-sm" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {trades.map(trade => (
                    <TradeProposalCard
                      key={trade.id}
                      trade={trade}
                      busy={tradeBusyId === trade.id}
                      onAccept={nextTrade => void respondTrade(nextTrade, true)}
                      onDecline={nextTrade => void respondTrade(nextTrade, false)}
                      onCancel={nextTrade => void cancelTrade(nextTrade)}
                      onApply={nextTrade => void applyTrade(nextTrade)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {ranking.length > 0 && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950">Ranking</h2>
                  <p className="text-sm font-semibold text-slate-500">Ordenado por quienes tienen menos faltantes.</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-700">
                  <Trophy className="h-5 w-5" />
                </span>
              </div>
              <div className="space-y-2">
                {ranking.map((friend, index) => {
                  const isSelf = isSelfFriendSummary(friend)

                  return (
                    <Link
                      key={friend.friendship_id}
                      href={isSelf ? '/album' : `/amigos/${encodeURIComponent(friend.username)}`}
                      className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 active:bg-slate-100"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-red-700 shadow-sm">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-950">{friend.username}</p>
                          {isSelf ? (
                            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-red-700">
                              Vos
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs font-bold text-slate-500">{metric(friend.missing_count)} faltan</p>
                      </div>
                      <p className="text-sm font-black text-slate-700">{metric(friend.percent)}%</p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black tracking-tight text-slate-950">Mis amigos</h2>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{acceptedFriends.length} activos</p>
            </div>
            {acceptedFriends.length === 0 ? (
              <div className="grid place-items-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <Users className="h-10 w-10 text-slate-300" />
                <p className="mt-4 text-sm font-bold text-slate-500">Todavia no tenes amigos aceptados.</p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-3">
                {acceptedFriends.map(friend => (
                  <FriendCard key={friend.friendship_id} friend={friend} onRemove={removeFriend} />
                ))}
              </div>
            )}
          </section>

          {outgoingRequests.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-xl font-black tracking-tight text-slate-950">Solicitudes enviadas</h2>
              <div className="grid gap-2 lg:grid-cols-3">
                {outgoingRequests.map(friend => (
                  <article key={friend.friendship_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                      <Clock3 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{friend.username}</p>
                      <p className="text-xs font-bold text-slate-500">Pendiente de aceptacion</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
