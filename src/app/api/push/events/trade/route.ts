import { NextResponse } from 'next/server'
import { getAuthenticatedPushContext, sendTradePush } from '@/lib/push-server'
import type { TradePushAction } from '@/lib/push'

export const runtime = 'nodejs'

const TRADE_ACTIONS = new Set<TradePushAction>(['created', 'accepted', 'declined', 'cancelled', 'applied'])

export async function POST(request: Request) {
  let context
  try {
    context = await getAuthenticatedPushContext(request)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as {
    proposalId?: unknown
    action?: unknown
  }
  const proposalId = typeof body.proposalId === 'string' ? body.proposalId : ''
  const action = typeof body.action === 'string' && TRADE_ACTIONS.has(body.action as TradePushAction)
    ? body.action as TradePushAction
    : null

  if (!proposalId || !action) {
    return NextResponse.json({ error: 'Faltan datos del intercambio.' }, { status: 400 })
  }

  try {
    const result = await sendTradePush({
      supabase: context.supabase,
      userId: context.userId,
      proposalId,
      action,
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo notificar.' }, { status: 500 })
  }
}
