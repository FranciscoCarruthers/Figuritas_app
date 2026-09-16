import { NextResponse } from 'next/server'
import { isEmailIdentifier, validateUsername } from '@/lib/auth'
import { createServerAuthClient, resolveAuthEmail } from '@/lib/auth-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : ''

  // Account existence, missing recovery email and provider errors all produce
  // the same acknowledgement. Never return lookup results or provider details.
  try {
    if (isEmailIdentifier(identifier) || !validateUsername(identifier)) {
      const email = await resolveAuthEmail(identifier)
      if (!email.endsWith('@figuritas.local')) {
        const supabase = createServerAuthClient()
        const redirectTo = `${new URL(request.url).origin}/login?reset=1`
        await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      }
    }
  } catch {
    // Deliberately preserve the same public response on lookup/delivery errors.
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
