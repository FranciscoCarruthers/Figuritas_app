import 'server-only'

import webpush from 'web-push'
import { buildStickerPushPayload, buildTradePushPayload, filterPushRecipients, getPushEnvConfig, type PushPayload, type TradePushAction } from '@/lib/push'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>

type PushSubscriptionRow = {
  id: string
  user_id: string
  device_id: string
  endpoint: string
  p256dh: string
  auth: string
  notify_trades: boolean
  notify_sticker_updates: boolean
  enabled: boolean
}

export type PushSendResult = {
  configured: boolean
  attempted: number
  sent: number
  failed: number
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export async function getAuthenticatedPushContext(request: Request): Promise<{ supabase: SupabaseAdmin; userId: string }> {
  const token = getBearerToken(request)
  if (!token) throw new Error('No autorizado.')

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error('No autorizado.')

  return { supabase, userId: data.user.id }
}

export async function getUsernameForUser(supabase: SupabaseAdmin, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle()

  return typeof data?.username === 'string' ? data.username : null
}

export async function sendPushToUser({
  supabase,
  userId,
  payload,
  sourceDeviceId = null,
  preference,
}: {
  supabase: SupabaseAdmin
  userId: string
  payload: PushPayload
  sourceDeviceId?: string | null
  preference: 'notify_trades' | 'notify_sticker_updates'
}): Promise<PushSendResult> {
  const config = getPushEnvConfig(process.env)
  if (!config.configured) {
    return { configured: false, attempted: 0, sent: 0, failed: 0 }
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id,user_id,device_id,endpoint,p256dh,auth,notify_trades,notify_sticker_updates,enabled')
    .eq('user_id', userId)
    .eq('enabled', true)
    .eq(preference, true)

  if (error) throw error

  const recipients = filterPushRecipients((data ?? []) as PushSubscriptionRow[], sourceDeviceId)
  let sent = 0
  let failed = 0

  await Promise.all(recipients.map(async recipient => {
    try {
      await webpush.sendNotification({
        endpoint: recipient.endpoint,
        keys: {
          p256dh: recipient.p256dh,
          auth: recipient.auth,
        },
      }, JSON.stringify(payload))
      sent += 1
    } catch (error) {
      failed += 1
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : 0
      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('id', recipient.id)
      }
    }
  }))

  return {
    configured: true,
    attempted: recipients.length,
    sent,
    failed,
  }
}

export async function sendStickerPush({
  supabase,
  userId,
  sourceDeviceId,
  code,
  quantity,
}: {
  supabase: SupabaseAdmin
  userId: string
  sourceDeviceId?: string | null
  code: string
  quantity: number
}) {
  const [{ data: sticker }, actorName] = await Promise.all([
    supabase
      .from('stickers')
      .select('code,name')
      .eq('code', code)
      .maybeSingle(),
    getUsernameForUser(supabase, userId),
  ])

  if (!sticker?.code) throw new Error('Sticker no encontrada.')

  return sendPushToUser({
    supabase,
    userId,
    sourceDeviceId,
    preference: 'notify_sticker_updates',
    payload: buildStickerPushPayload({
      code: sticker.code,
      name: sticker.name,
      quantity,
      actorName,
    }),
  })
}

export async function sendTradePush({
  supabase,
  userId,
  proposalId,
  action,
}: {
  supabase: SupabaseAdmin
  userId: string
  proposalId: string
  action: TradePushAction
}) {
  const { data: proposal, error } = await supabase
    .from('trade_proposals')
    .select('requester_id,addressee_id')
    .eq('id', proposalId)
    .maybeSingle()

  if (error) throw error
  if (!proposal) throw new Error('Intercambio no encontrado.')
  if (proposal.requester_id !== userId && proposal.addressee_id !== userId) {
    throw new Error('No autorizado.')
  }

  const targetUserId = proposal.requester_id === userId ? proposal.addressee_id : proposal.requester_id
  const [actorName, targetUsername] = await Promise.all([
    getUsernameForUser(supabase, userId),
    getUsernameForUser(supabase, targetUserId),
  ])

  return sendPushToUser({
    supabase,
    userId: targetUserId,
    preference: 'notify_trades',
    payload: buildTradePushPayload({
      action,
      actorName,
      friendUsername: targetUsername ?? targetUserId,
    }),
  })
}
