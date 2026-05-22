import { NextResponse } from 'next/server'
import { getAuthenticatedPushContext, sendStickerPush } from '@/lib/push-server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let context
  try {
    context = await getAuthenticatedPushContext(request)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    deviceId?: unknown
    code?: unknown
    quantity?: unknown
  }
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  const quantity = typeof body.quantity === 'number' ? body.quantity : Number(body.quantity ?? 0)
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId : null

  if (!code) return NextResponse.json({ error: 'Falta codigo de figurita.' }, { status: 400 })

  try {
    const result = await sendStickerPush({
      supabase: context.supabase,
      userId: context.userId,
      sourceDeviceId: deviceId,
      code,
      quantity,
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo notificar.' }, { status: 500 })
  }
}
