import { NextResponse } from 'next/server'
import { isEmailIdentifier, normalizeEmail, normalizeUsername, usernameToEmail, validateUsername } from '@/lib/auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const { identifier: rawIdentifier } = await request.json().catch(() => ({ identifier: '' }))
  const identifier = String(rawIdentifier ?? '').trim()

  if (isEmailIdentifier(identifier)) {
    return NextResponse.json({ email: normalizeEmail(identifier) })
  }

  const username = normalizeUsername(identifier)
  const usernameError = validateUsername(username)
  if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 })

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch {
    return NextResponse.json({ email: usernameToEmail(username) })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  if (!profile?.user_id) return NextResponse.json({ error: 'No encontramos ese usuario.' }, { status: 404 })

  const { data, error } = await supabase.auth.admin.getUserById(profile.user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const email = data.user?.email
  if (!email) return NextResponse.json({ error: 'Ese usuario no tiene email de acceso.' }, { status: 404 })

  return NextResponse.json({ email })
}
