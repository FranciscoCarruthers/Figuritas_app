import { NextResponse } from 'next/server'
import { isEmailIdentifier, validatePassword, validateUsername } from '@/lib/auth'
import { createServerAuthClient, resolveAuthEmail } from '@/lib/auth-server'

const INVALID_CREDENTIALS = 'Usuario, correo o contraseña incorrectos.'
const HEADERS = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if ((!isEmailIdentifier(identifier) && validateUsername(identifier)) || validatePassword(password)) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401, headers: HEADERS })
  }

  try {
    const supabase = createServerAuthClient()
    const email = await resolveAuthEmail(identifier)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401, headers: HEADERS })
    }

    // Only credentials verified by Supabase can receive session tokens.
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }, { headers: HEADERS })
  } catch {
    return NextResponse.json({ error: 'No se pudo iniciar sesión. Intentá nuevamente.' }, {
      status: 503,
      headers: HEADERS,
    })
  }
}
