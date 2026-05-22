import { NextResponse } from 'next/server'
import { getAuthenticatedPushContext } from '@/lib/push-server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let context
  try {
    context = await getAuthenticatedPushContext(request)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { deviceId?: unknown; endpoint?: unknown }
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : ''

  if (!deviceId && !endpoint) {
    return NextResponse.json({ error: 'Falta identificar el dispositivo.' }, { status: 400 })
  }

  let query = context.supabase
    .from('push_subscriptions')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('user_id', context.userId)

  query = deviceId ? query.eq('device_id', deviceId) : query.eq('endpoint', endpoint)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
