import { NextResponse } from 'next/server'
import {
  normalizeEmail,
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateRecoveryEmail,
  validateUsername,
} from '@/lib/auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const { username: rawUsername, password, email: rawEmail } = await request.json().catch(() => ({
    username: '',
    password: '',
    email: '',
  }))
  const username = normalizeUsername(String(rawUsername ?? ''))
  const recoveryEmail = normalizeEmail(String(rawEmail ?? ''))
  const usernameError = validateUsername(username)
  const passwordError = validatePassword(String(password ?? ''))
  const emailError = validateRecoveryEmail(recoveryEmail)

  if (usernameError || passwordError || emailError) {
    return NextResponse.json({ error: usernameError ?? passwordError ?? emailError }, { status: 400 })
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch {
    return NextResponse.json({
      error: 'Falta SUPABASE_SERVICE_ROLE_KEY. Se usara el registro publico de Supabase si esta habilitado.',
    }, { status: 501 })
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle()

  if (existingProfileError) {
    return NextResponse.json({ error: existingProfileError.message }, { status: 500 })
  }

  if (existingProfile) {
    return NextResponse.json({ error: 'Ese usuario ya existe.' }, { status: 409 })
  }

  const email = recoveryEmail || usernameToEmail(username)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, recovery_email: recoveryEmail || null },
  })

  if (error) {
    const alreadyExists = error.message.toLowerCase().includes('already')
    return NextResponse.json(
      { error: alreadyExists ? 'Ese usuario ya existe.' : error.message },
      { status: alreadyExists ? 409 : 400 },
    )
  }

  const userId = data.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'No se pudo crear el usuario.' }, { status: 500 })
  }

  const albumId = crypto.randomUUID()

  const { error: albumError } = await supabase.from('albums').insert({
    id: albumId,
    owner_id: userId,
    name: `Album ${username}`,
    edition_id: 'fifa-world-cup-2026',
  })

  if (albumError) {
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: albumError.message }, { status: 500 })
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    user_id: userId,
    username,
    album_id: albumId,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
