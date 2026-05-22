import { NextResponse } from 'next/server'
import { getAuthenticatedPushContext } from '@/lib/push-server'

export const runtime = 'nodejs'

type PushSubscriptionBody = {
  deviceId?: unknown
  subscription?: {
    endpoint?: unknown
    keys?: {
      p256dh?: unknown
      auth?: unknown
    }
  }
  preferences?: {
    trades?: unknown
    stickerUpdates?: unknown
  }
}

export async function POST(request: Request) {
  let context
  try {
    context = await getAuthenticatedPushContext(request)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as PushSubscriptionBody
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
  const endpoint = typeof body.subscription?.endpoint === 'string' ? body.subscription.endpoint : ''
  const p256dh = typeof body.subscription?.keys?.p256dh === 'string' ? body.subscription.keys.p256dh : ''
  const auth = typeof body.subscription?.keys?.auth === 'string' ? body.subscription.keys.auth : ''

  if (!deviceId || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Suscripcion push invalida.' }, { status: 400 })
  }

  const { error } = await context.supabase
    .from('push_subscriptions')
    .upsert({
      user_id: context.userId,
      device_id: deviceId,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get('user-agent'),
      notify_trades: body.preferences?.trades !== false,
      notify_sticker_updates: body.preferences?.stickerUpdates !== false,
      enabled: true,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,device_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
