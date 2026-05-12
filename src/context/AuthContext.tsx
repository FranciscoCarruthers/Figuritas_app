'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { normalizeUsername, usernameToEmail, validatePassword, validateUsername } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

type AuthContextValue = {
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getUsernameFromSession(session: Session): string {
  const metadataUsername = session.user.user_metadata?.username
  if (typeof metadataUsername === 'string' && metadataUsername.trim()) {
    return normalizeUsername(metadataUsername)
  }

  return normalizeUsername(session.user.email?.split('@')[0] ?? 'album')
}

async function ensureProfile(session: Session): Promise<UserProfile> {
  const supabase = getSupabaseBrowserClient()
  const username = getUsernameFromSession(session)
  const { data, error } = await supabase
    .rpc('ensure_album_for_user', { p_username: username })
    .single()

  if (error) throw error
  return data as UserProfile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)

    if (!nextSession) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    try {
      const nextProfile = await ensureProfile(nextSession)
      setProfile(nextProfile)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) void applySession(data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) void applySession(nextSession)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [applySession])

  const signIn = useCallback(async (usernameValue: string, password: string) => {
    const username = normalizeUsername(usernameValue)
    const usernameError = validateUsername(username)
    const passwordError = validatePassword(password)
    if (usernameError) throw new Error(usernameError)
    if (passwordError) throw new Error(passwordError)

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })

    if (error) {
      setIsLoading(false)
      throw error
    }

    await applySession(data.session)
  }, [applySession])

  const signUp = useCallback(async (usernameValue: string, password: string) => {
    const username = normalizeUsername(usernameValue)
    const usernameError = validateUsername(username)
    const passwordError = validatePassword(password)
    if (usernameError) throw new Error(usernameError)
    if (passwordError) throw new Error(passwordError)

    setIsLoading(true)
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (response.status === 501) {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signUp({
        email: usernameToEmail(username),
        password,
        options: { data: { username } },
      })
      if (error) {
        setIsLoading(false)
        throw error
      }
    } else if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'No se pudo crear el album.' }))
      setIsLoading(false)
      throw new Error(payload.error ?? 'No se pudo crear el album.')
    }

    await signIn(username, password)
  }, [signIn])

  const signOut = useCallback(async () => {
    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    await applySession(null)
  }, [applySession])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
  }), [isLoading, profile, session, signIn, signOut, signUp])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return value
}
