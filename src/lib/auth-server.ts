import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { isEmailIdentifier, normalizeEmail, normalizeUsername, usernameToEmail } from '@/lib/auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

// A fresh, non-privileged client for each request. Never sign users in with the
// admin client or share a mutable auth session between requests.
export function createServerAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Auth is not configured')

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

// This result must remain on the server; it is not a public username directory.
export async function resolveAuthEmail(identifier: string): Promise<string> {
  if (isEmailIdentifier(identifier)) return normalizeEmail(identifier)

  const username = normalizeUsername(identifier)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return usernameToEmail(username)

  const admin = getSupabaseAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle()

  if (profileError) throw profileError
  // Still attempt password authentication for unknown users, with the same
  // public error response as an incorrect password on an existing account.
  if (!profile?.user_id) return usernameToEmail(username)

  const { data, error } = await admin.auth.admin.getUserById(profile.user_id)
  if (error) throw error
  return data.user?.email ?? usernameToEmail(username)
}
