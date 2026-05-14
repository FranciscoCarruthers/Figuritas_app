'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { STICKERS } from '@/data/sticker-data'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { AlbumState, AlbumSticker } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'

type AlbumContextValue = {
  albumState: AlbumState
  isLoading: boolean
  updateQuantity: (code: string, quantity: number) => Promise<void>
  importMissingCodes: (missingCodes: Set<string>, onProgress?: ImportProgressCallback) => Promise<number>
}

const AlbumContext = createContext<AlbumContextValue | null>(null)
const IMPORT_BATCH_SIZE = 20

type ImportProgressCallback = (progress: { completed: number; total: number }) => void

export function AlbumProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [albumState, setAlbumState] = useState<AlbumState>({})
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (!profile) {
      setAlbumState({})
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    supabase
      .from('album_stickers')
      .select('*')
      .eq('album_id', profile.album_id)
      .then(({ data, error }) => {
        if (!error && data) {
          const nextState: AlbumState = {}
          for (const sticker of data as AlbumSticker[]) {
            nextState[sticker.sticker_code] = sticker
          }
          setAlbumState(nextState)
        }
        setIsLoading(false)
      })

    channelRef.current = supabase
      .channel(`album:${profile.album_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'album_stickers', filter: `album_id=eq.${profile.album_id}` },
        payload => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Pick<AlbumSticker, 'sticker_code'>
            setAlbumState(prev => {
              const next = { ...prev }
              delete next[oldRow.sticker_code]
              return next
            })
            return
          }

          const updated = payload.new as AlbumSticker
          setAlbumState(prev => ({ ...prev, [updated.sticker_code]: updated }))
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

  const updateQuantity = useCallback(async (code: string, quantityValue: number) => {
    if (!profile) throw new Error('No hay album activo.')
    const quantity = Math.max(0, Math.min(99, Math.trunc(quantityValue)))
    const supabase = getSupabaseBrowserClient()

    setAlbumState(prev => {
      const next = { ...prev }
      if (quantity === 0) {
        delete next[code]
      } else {
        next[code] = {
          sticker_code: code,
          quantity,
          updated_by: null,
          updated_at: new Date().toISOString(),
        }
      }
      return next
    })

    const { error } = await supabase.rpc('set_sticker_quantity', {
      p_sticker_code: code,
      p_quantity: quantity,
    })

    if (error) throw error
  }, [profile])

  const importMissingCodes = useCallback(async (
    missingCodes: Set<string>,
    onProgress?: ImportProgressCallback,
  ) => {
    if (!profile) throw new Error('No hay album activo.')
    const supabase = getSupabaseBrowserClient()
    const changes = STICKERS.map(sticker => {
      const nextQuantity = missingCodes.has(sticker.code) ? 0 : 1
      const currentQuantity = albumState[sticker.code]?.quantity ?? 0
      const currentOwned = currentQuantity > 0
      const nextOwned = nextQuantity > 0
      return currentOwned === nextOwned ? null : { code: sticker.code, quantity: nextQuantity }
    }).filter((item): item is { code: string; quantity: number } => item !== null)

    onProgress?.({ completed: 0, total: changes.length })

    setAlbumState(prev => {
      const next = { ...prev }
      for (const sticker of STICKERS) {
        if (missingCodes.has(sticker.code)) {
          delete next[sticker.code]
        } else {
          next[sticker.code] = {
            sticker_code: sticker.code,
            quantity: 1,
            updated_by: null,
            updated_at: new Date().toISOString(),
          }
        }
      }
      return next
    })

    let completed = 0
    for (let index = 0; index < changes.length; index += IMPORT_BATCH_SIZE) {
      const batch = changes.slice(index, index + IMPORT_BATCH_SIZE)
      const results = await Promise.all(batch.map(change => supabase.rpc('set_sticker_quantity', {
        p_sticker_code: change.code,
        p_quantity: change.quantity,
      })))
      const failed = results.find(result => result.error)
      if (failed?.error) throw failed.error

      completed += batch.length
      onProgress?.({ completed, total: changes.length })
    }

    return changes.length
  }, [albumState, profile])

  const value = useMemo<AlbumContextValue>(() => ({
    albumState,
    isLoading,
    updateQuantity,
    importMissingCodes,
  }), [albumState, importMissingCodes, isLoading, updateQuantity])

  return <AlbumContext.Provider value={value}>{children}</AlbumContext.Provider>
}

export function useAlbum() {
  const value = useContext(AlbumContext)
  if (!value) throw new Error('useAlbum debe usarse dentro de AlbumProvider')
  return value
}
