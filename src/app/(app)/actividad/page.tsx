'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, CheckCircle2, XCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { ActivityEntry } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

function dayKey(value: string): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayLabel(value: string): string {
  const date = new Date(value)
  const today = dayKey(new Date().toISOString())
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  const key = dayKey(value)

  if (key === today) return 'Hoy'
  if (key === yesterday) return 'Ayer'

  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

function entryMessage(entry: ActivityEntry): string {
  const user = entry.user_name || 'Alguien'
  const action = entry.quantity > 0 ? 'marco' : 'desmarco'
  return `${user} ${action} ${entry.sticker_code}`
}

export default function ActividadPage() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!profile) return

    setLoading(true)
    supabase
      .from('activity_log')
      .select('*')
      .eq('album_id', profile.album_id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setEntries((data as ActivityEntry[]) ?? [])
        setLoading(false)
      })

    channelRef.current = supabase
      .channel(`activity:${profile.album_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `album_id=eq.${profile.album_id}` },
        payload => {
          setEntries(prev => [payload.new as ActivityEntry, ...prev.slice(0, 99)])
        },
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [profile])

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, ActivityEntry[]>()
    for (const entry of entries) {
      const key = dayKey(entry.created_at)
      groups.set(key, [...(groups.get(key) ?? []), entry])
    }
    return [...groups.entries()].map(([key, items]) => ({ key, label: dayLabel(items[0].created_at), items }))
  }, [entries])

  return (
    <main className="mx-auto max-w-4xl px-4 pb-5 pt-5 lg:px-8 lg:pb-8">
      <header className="safe-top">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Historial</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Actividad</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Ultimos cambios del album</p>
      </header>

      {loading ? (
        <section className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </section>
      ) : entries.length === 0 ? (
        <section className="mt-8 grid place-items-center rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Activity className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-bold text-slate-500">Sin movimientos todavia.</p>
        </section>
      ) : (
        <section className="mt-6 space-y-5">
          {groupedEntries.map(group => (
            <div key={group.key}>
              <h2 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{group.label}</h2>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
                {group.items.map(entry => (
                  <article key={entry.id} className="flex items-start gap-3 p-3 lg:p-4">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      entry.quantity > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {entry.quantity > 0 ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black leading-snug text-slate-950">{entryMessage(entry)}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {entry.sticker_name} - {entry.sticker_team}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs font-semibold text-slate-400">{timeAgo(entry.created_at)}</time>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
