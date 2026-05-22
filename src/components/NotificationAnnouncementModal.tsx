'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BellRing, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PUSH_NOTIFICATIONS_ANNOUNCEMENT_KEY } from '@/lib/announcements'
import {
  readCachedAnnouncementSeen,
  writeCachedAnnouncementSeen,
} from '@/lib/local-cache'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type ModalStatus = 'checking' | 'hidden' | 'visible'

function getLocalStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export default function NotificationAnnouncementModal() {
  const { profile } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<ModalStatus>('checking')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!profile?.user_id) {
      setStatus('hidden')
      return
    }

    let active = true
    const storage = getLocalStorage()
    if (storage && readCachedAnnouncementSeen(storage, profile.user_id, PUSH_NOTIFICATIONS_ANNOUNCEMENT_KEY)) {
      setStatus('hidden')
      return
    }

    setStatus('checking')
    const loadAnnouncementStatus = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data } = await supabase
          .from('user_announcements')
          .select('seen_at')
          .eq('user_id', profile.user_id)
          .eq('announcement_key', PUSH_NOTIFICATIONS_ANNOUNCEMENT_KEY)
          .maybeSingle()

        if (!active) return
        if (data) {
          if (storage) writeCachedAnnouncementSeen(storage, profile.user_id, PUSH_NOTIFICATIONS_ANNOUNCEMENT_KEY)
          setStatus('hidden')
          return
        }
        setStatus('visible')
      } catch {
        if (active) setStatus('visible')
      }
    }

    void loadAnnouncementStatus()

    return () => {
      active = false
    }
  }, [profile?.user_id])

  const markSeen = useCallback(async (nextPath?: string) => {
    if (!profile?.user_id) return

    setIsSaving(true)
    const storage = getLocalStorage()
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase
        .from('user_announcements')
        .insert({
          user_id: profile.user_id,
          announcement_key: PUSH_NOTIFICATIONS_ANNOUNCEMENT_KEY,
        })

      if (error && error.code !== '23505') throw error
    } catch {
      // If the DB write fails, avoid showing the same announcement in a loop on this device.
    } finally {
      if (storage) writeCachedAnnouncementSeen(storage, profile.user_id, PUSH_NOTIFICATIONS_ANNOUNCEMENT_KEY)
      setIsSaving(false)
      setStatus('hidden')
      if (nextPath) router.push(nextPath)
    }
  }, [profile?.user_id, router])

  if (status !== 'visible') return null

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-700">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Actualizacion</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Notificaciones nuevas</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Ya podes recibir avisos por intercambios y cuando alguien marque o desmarque una
              figurita desde otro dispositivo de la misma cuenta.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <p>Se activan desde <span className="font-bold text-slate-950">Actividad &gt; Activar notificaciones</span>.</p>
          </div>
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <p>Solo tiene que activarlas el dispositivo que quiere recibir avisos.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-black text-white shadow-sm disabled:opacity-70"
            disabled={isSaving}
            onClick={() => void markSeen('/actividad')}
            type="button"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Ir a Actividad
          </button>
          <button
            className="h-12 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 disabled:opacity-70"
            disabled={isSaving}
            onClick={() => void markSeen()}
            type="button"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
