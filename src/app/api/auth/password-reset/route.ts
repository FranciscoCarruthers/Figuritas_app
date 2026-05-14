import { NextResponse } from 'next/server'
import {
  isEmailIdentifier,
  normalizeEmail,
  normalizeUsername,
  validateRecoveryEmail,
  validateUsername,
} from '@/lib/auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

async function findUserEmailByIdentifier(supabase: ReturnType<typeof getSupabaseAdminClient>, identifier: string) {
  if (isEmailIdentifier(identifier)) {
    const email = normalizeEmail(identifier)
    const emailError = validateRecoveryEmail(email)
    if (emailError) throw new Error(emailError)

    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      const user = data.users.find(item => item.email?.toLowerCase() === email)
      if (user?.email) return user.email
      if (data.users.length < 1000) break
    }

    return null
  }

  const username = normalizeUsername(identifier)
  const usernameError = validateUsername(username)
  if (usernameError) throw new Error(usernameError)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile?.user_id) return null

  const { data, error } = await supabase.auth.admin.getUserById(profile.user_id)
  if (error) throw error
  return data.user?.email ?? null
}

export async function POST(request: Request) {
  const { identifier: rawIdentifier } = await request.json().catch(() => ({ identifier: '' }))
  const identifier = String(rawIdentifier ?? '').trim()

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch {
    return NextResponse.json({ error: 'Falta configurar la clave privada de Supabase.' }, { status: 501 })
  }

  let email: string | null
  try {
    email = await findUserEmailByIdentifier(supabase, identifier)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo buscar el usuario.' },
      { status: 400 },
    )
  }

  if (!email) return NextResponse.json({ error: 'No encontramos un usuario con ese dato.' }, { status: 404 })
  if (email.endsWith('@figuritas.local')) {
    return NextResponse.json({
      error: 'Ese usuario fue creado sin mail real. No puede recuperar contrasena por email.',
    }, { status: 400 })
  }

  const redirectTo = `${new URL(request.url).origin}/login?reset=1`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
