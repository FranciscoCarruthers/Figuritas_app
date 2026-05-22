'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, CircleDashed, Handshake, Loader2, Minus, Plus, RefreshCw, Sparkles } from 'lucide-react'
import ProgressBar from '@/components/ProgressBar'
import { ALBUM_GROUPS, getTeamStickers } from '@/data/sticker-data'
import { useAlbum } from '@/context/AlbumContext'
import { useAuth } from '@/context/AuthContext'
import { trackAppEvent } from '@/lib/app-analytics'
import { buildFriendAlbumState } from '@/lib/friends'
import { notifyTradeEvent } from '@/lib/push-client'
import { buildAlbumBlocks } from '@/lib/sticker-blocks'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import {
  buildTradeSuggestions,
  isFormationSticker,
  summarizeTradeSelection,
  validateTradeRules,
  type TradeSelectionItem,
} from '@/lib/trades'
import type { DuplicateSummary, FriendAlbumSticker, TradeRuleSet } from '@/lib/types'

const ORDERED_STICKERS = buildAlbumBlocks(ALBUM_GROUPS, getTeamStickers).flatMap(block => block.stickers)

type SelectionState = Record<string, number>

function asAlbumRows(data: unknown): FriendAlbumSticker[] {
  return (Array.isArray(data) ? data : []) as FriendAlbumSticker[]
}

function selectionToItems(items: DuplicateSummary[], selection: SelectionState): TradeSelectionItem[] {
  return items
    .map(item => ({
      sticker: item.sticker,
      quantity: Math.min(item.available, selection[item.sticker.code] ?? 0),
    }))
    .filter(item => item.quantity > 0)
}

function setSelectionQuantity(
  setSelection: (value: (current: SelectionState) => SelectionState) => void,
  code: string,
  nextQuantity: number,
) {
  setSelection(current => {
    const next = { ...current }
    if (nextQuantity <= 0) {
      delete next[code]
    } else {
      next[code] = nextQuantity
    }
    return next
  })
}

export default function IntercambiarPage() {
  const params = useParams<{ username: string }>()
  const requestedUsername = decodeURIComponent(String(params.username ?? '')).toLowerCase()
  const { albumState } = useAlbum()
  const { session } = useAuth()
  const [rows, setRows] = useState<FriendAlbumSticker[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [rules, setRules] = useState<TradeRuleSet>({
    sameQuantity: true,
    sameFoils: false,
    sameFormations: false,
  })
  const [mySelection, setMySelection] = useState<SelectionState>({})
  const [friendSelection, setFriendSelection] = useState<SelectionState>({})

  const friendState = useMemo(() => buildFriendAlbumState(rows), [rows])
  const friendUsername = rows[0]?.username ?? requestedUsername
  const suggestions = useMemo(
    () => buildTradeSuggestions(albumState, friendState, ORDERED_STICKERS),
    [albumState, friendState],
  )
  const myItems = useMemo(
    () => selectionToItems(suggestions.mineUseful, mySelection),
    [mySelection, suggestions.mineUseful],
  )
  const friendItems = useMemo(
    () => selectionToItems(suggestions.friendUseful, friendSelection),
    [friendSelection, suggestions.friendUseful],
  )
  const mySummary = summarizeTradeSelection(myItems)
  const friendSummary = summarizeTradeSelection(friendItems)
  const validation = validateTradeRules(myItems, friendItems, rules)
  const totalUseful = suggestions.mineUseful.length + suggestions.friendUseful.length

  const loadFriendAlbum = useCallback(async (trackRefresh = false) => {
    setLoading(true)
    setError('')
    const supabase = getSupabaseBrowserClient()
    const { data, error: rpcError } = await supabase.rpc('get_friend_album', { p_username: requestedUsername })
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setRows(asAlbumRows(data))
      if (trackRefresh) trackAppEvent('friends_refreshed', { username: requestedUsername, scope: 'trade' })
    }
    setLoading(false)
  }, [requestedUsername])

  useEffect(() => {
    void loadFriendAlbum()
  }, [loadFriendAlbum])

  useEffect(() => {
    if (Object.keys(mySelection).length > 0 || Object.keys(friendSelection).length > 0) return
    const balancedCount = Math.min(suggestions.mineUseful.length, suggestions.friendUseful.length)
    if (balancedCount === 0) return

    setMySelection(Object.fromEntries(suggestions.mineUseful.slice(0, balancedCount).map(item => [item.sticker.code, 1])))
    setFriendSelection(Object.fromEntries(suggestions.friendUseful.slice(0, balancedCount).map(item => [item.sticker.code, 1])))
  }, [friendSelection, mySelection, suggestions.friendUseful, suggestions.mineUseful])

  async function createProposal() {
    if (!validation.valid) return

    setSubmitting(true)
    setError('')
    setMessage('')
    const payload = [
      ...myItems.map(item => ({ side: 'mine', code: item.sticker.code, quantity: item.quantity })),
      ...friendItems.map(item => ({ side: 'theirs', code: item.sticker.code, quantity: item.quantity })),
    ]

    const supabase = getSupabaseBrowserClient()
    const { data: proposalId, error: rpcError } = await supabase.rpc('create_trade_proposal', {
      p_friend_username: requestedUsername,
      p_items: payload,
      p_same_quantity: rules.sameQuantity,
      p_same_foils: rules.sameFoils,
      p_same_formations: rules.sameFormations,
    })

    if (rpcError) {
      setError(rpcError.message)
    } else {
      trackAppEvent('trade_proposal_created', {
        friend: requestedUsername,
        mine: mySummary.total,
        theirs: friendSummary.total,
      })
      if (typeof proposalId === 'string') {
        void notifyTradeEvent(session, { proposalId, action: 'created' })
      }
      setMessage('Propuesta enviada. Tu amigo la va a ver en Amigos.')
    }
    setSubmitting(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 lg:px-8 lg:pb-8">
      <header className="safe-top pb-5 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/amigos"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 active:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Amigos
          </Link>
          <button
            type="button"
            onClick={() => void loadFriendAlbum(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 active:bg-slate-100"
            aria-label="Refrescar intercambio"
            title="Refrescar intercambio"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs font-black tracking-[0.08em] text-red-700">Intercambio</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{friendUsername}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Arma una propuesta con tus repetidas y las de tu amigo.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p>
      ) : null}

      {loading ? (
        <section className="grid gap-3 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl bg-white shadow-sm" />
          <div className="h-72 animate-pulse rounded-xl bg-white shadow-sm" />
        </section>
      ) : totalUseful === 0 ? (
        <section className="grid place-items-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <CircleDashed className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-500">
            Todavia no hay repetidas utiles para cruzar con {friendUsername}.
          </p>
          <Link href="/repetidas" className="mt-4 rounded-lg bg-red-700 px-4 py-3 text-sm font-black text-white">
            Cargar repetidas
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Reglas</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Si una regla no cierra, no se puede proponer el intercambio.
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-700">
                <Handshake className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <RuleToggle
                label="Misma cantidad"
                checked={rules.sameQuantity}
                onChange={() => setRules(current => ({ ...current, sameQuantity: !current.sameQuantity }))}
              />
              <RuleToggle
                label="Brillantes por brillantes"
                checked={rules.sameFoils}
                onChange={() => setRules(current => ({ ...current, sameFoils: !current.sameFoils }))}
              />
              <RuleToggle
                label="Formaciones por formaciones"
                checked={rules.sameFormations}
                onChange={() => setRules(current => ({ ...current, sameFormations: !current.sameFormations }))}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TradeSummary title="Das" summary={mySummary} />
              <TradeSummary title="Recibis" summary={friendSummary} red />
            </div>
            <div className="mt-4">
              <ProgressBar value={validation.valid ? 100 : 35} color={validation.valid ? '#b91c1c' : '#94a3b8'} />
            </div>
            {!validation.valid ? (
              <div className="mt-3 space-y-1">
                {validation.messages.map(item => (
                  <p key={item} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">{item}</p>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-2">
            <TradeSide
              title="Tus repes que le sirven"
              items={suggestions.mineUseful}
              selection={mySelection}
              setSelection={setMySelection}
            />
            <TradeSide
              title="Sus repes que te sirven"
              items={suggestions.friendUseful}
              selection={friendSelection}
              setSelection={setFriendSelection}
              red
            />
          </section>

          <section className="sticky bottom-20 z-20 mt-5 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4 lg:mx-auto lg:max-w-xl">
            <button
              type="button"
              disabled={!validation.valid || submitting}
              onClick={() => void createProposal()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
              Proponer intercambio
            </button>
          </section>
        </>
      )}
    </main>
  )
}

function RuleToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex h-12 items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-black ${
        checked ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600'
      }`}
    >
      <span>{label}</span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${checked ? 'bg-white text-red-700' : 'bg-white text-slate-400'}`}>
        {checked ? <Check className="h-4 w-4" /> : null}
      </span>
    </button>
  )
}

function TradeSummary({
  title,
  summary,
  red = false,
}: {
  title: string
  summary: ReturnType<typeof summarizeTradeSelection>
  red?: boolean
}) {
  return (
    <div className={red ? 'rounded-lg bg-red-50 p-3' : 'rounded-lg bg-slate-50 p-3'}>
      <p className={red ? 'text-xs font-black uppercase tracking-[0.1em] text-red-700' : 'text-xs font-black uppercase tracking-[0.1em] text-slate-400'}>
        {title}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <span className="rounded-lg bg-white px-2 py-2 text-sm font-black text-slate-950">{summary.total}<br /><small className="font-bold text-slate-400">total</small></span>
        <span className="rounded-lg bg-white px-2 py-2 text-sm font-black text-slate-950">{summary.foils}<br /><small className="font-bold text-slate-400">brill.</small></span>
        <span className="rounded-lg bg-white px-2 py-2 text-sm font-black text-slate-950">{summary.formations}<br /><small className="font-bold text-slate-400">form.</small></span>
      </div>
    </div>
  )
}

function TradeSide({
  title,
  items,
  selection,
  setSelection,
  red = false,
}: {
  title: string
  items: DuplicateSummary[]
  selection: SelectionState
  setSelection: (value: (current: SelectionState) => SelectionState) => void
  red?: boolean
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <span className={red ? 'rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600'}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">No hay coincidencias utiles.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const selected = selection[item.sticker.code] ?? 0
            return (
              <article key={item.sticker.code} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div className={item.sticker.isFoil ? 'grid h-12 w-12 shrink-0 place-items-center rounded-full border border-amber-300 bg-amber-50 text-sm font-black text-amber-900' : 'grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-slate-700'}>
                  {item.sticker.position === 0 ? '00' : item.sticker.position}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950">{item.sticker.code}</p>
                    {item.sticker.isFoil ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
                    {isFormationSticker(item.sticker) ? (
                      <span className="shrink-0 rounded-full bg-slate-950 px-1.5 py-0.5 text-[9px] font-black text-white">13</span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs font-bold text-slate-500">{item.sticker.name}</p>
                  <p className="text-[11px] font-black text-slate-400">{item.available} disponibles</p>
                </div>
                <div className="grid grid-cols-[36px_32px_36px] items-center rounded-lg bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSelectionQuantity(setSelection, item.sticker.code, selected - 1)}
                    disabled={selected === 0}
                    className="grid h-8 place-items-center rounded-md text-slate-600 disabled:opacity-30"
                    aria-label={`Restar ${item.sticker.code}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-center text-sm font-black text-slate-950">{selected}</span>
                  <button
                    type="button"
                    onClick={() => setSelectionQuantity(setSelection, item.sticker.code, Math.min(item.available, selected + 1))}
                    disabled={selected >= item.available}
                    className="grid h-8 place-items-center rounded-md bg-red-700 text-white disabled:bg-slate-200 disabled:text-slate-400"
                    aria-label={`Sumar ${item.sticker.code}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
