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
import {
  isEmailIdentifier,
  normalizeEmail,
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateRecoveryEmail,
  validateUsername,
} from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

type AuthContextValue = {
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signUp: (username: string, password: string, email?: string) => Promise<void>
  requestPasswordReset: (identifier: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
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

async function resolveLoginEmail(identifierValue: string): Promise<string> {
  const identifier = identifierValue.trim()
  if (isEmailIdentifier(identifier)) return normalizeEmail(identifier)

  const username = normalizeUsername(identifier)
  const response = await fetch('/api/auth/resolve-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'No se pudo encontrar ese usuario.' }))
    throw new Error(payload.error ?? 'No se pudo encontrar ese usuario.')
  }

  const payload = await response.json() as { email?: string }
  if (!payload.email) throw new Error('No se pudo encontrar ese usuario.')
  return payload.email
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

  const signIn = useCallback(async (identifierValue: string, password: string) => {
    const identifier = identifierValue.trim()
    const usernameError = isEmailIdentifier(identifier) ? null : validateUsername(identifier)
    const passwordError = validatePassword(password)
    if (usernameError) throw new Error(usernameError)
    if (passwordError) throw new Error(passwordError)

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    let email: string
    try {
      email = await resolveLoginEmail(identifier)
    } catch (error) {
      setIsLoading(false)
      throw error
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setIsLoading(false)
      throw error
    }

    await applySession(data.session)
  }, [applySession])

  const signUp = useCallback(async (usernameValue: string, password: string, emailValue = '') => {
    const username = normalizeUsername(usernameValue)
    const email = normalizeEmail(emailValue)
    const usernameError = validateUsername(username)
    const passwordError = validatePassword(password)
    const emailError = validateRecoveryEmail(email)
    if (usernameError) throw new Error(usernameError)
    if (passwordError) throw new Error(passwordError)
    if (emailError) throw new Error(emailError)

    setIsLoading(true)
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    })

    if (response.status === 501) {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signUp({
        email: email || usernameToEmail(username),
        password,
        options: { data: { username, recovery_email: email || null } },
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

    await signIn(email || username, password)
  }, [signIn])

  const requestPasswordReset = useCallback(async (identifierValue: string) => {
    const identifier = identifierValue.trim()
    const usernameError = isEmailIdentifier(identifier) ? null : validateUsername(identifier)
    if (usernameError) throw new Error(usernameError)

    const response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'No se pudo enviar el mail.' }))
      throw new Error(payload.error ?? 'No se pudo enviar el mail.')
    }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const passwordError = validatePassword(password)
    if (passwordError) throw new Error(passwordError)

    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) {
      setIsLoading(false)
      throw error
    }
    await applySession(data.user ? (await supabase.auth.getSession()).data.session : null)
  }, [applySession])

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
    requestPasswordReset,
    updatePassword,
    signOut,
  }), [isLoading, profile, requestPasswordReset, session, signIn, signOut, signUp, updatePassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return value
}
