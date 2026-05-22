export type PushPayload = {
  title: string
  body: string
  url: string
  tag: string
}

export type PushRecipientLike = {
  device_id: string
  endpoint: string
  enabled: boolean
}

export type PushEnvConfig =
  | { configured: false }
  | {
      configured: true
      publicKey: string
      privateKey: string
      subject: string
    }

export type TradePushAction = 'created' | 'accepted' | 'declined' | 'cancelled' | 'applied'

export function buildStickerPushPayload({
  code,
  name,
  quantity,
  actorName,
}: {
  code: string
  name: string
  quantity: number
  actorName?: string | null
}): PushPayload {
  const actor = actorName?.trim()
  const action = quantity > 0 ? 'marco' : 'desmarco'
  const prefix = actor ? `${actor} ${action}` : `Se ${action}`

  return {
    title: 'FiguritasApp',
    body: `${prefix} ${code} - ${name}`,
    url: '/actividad',
    tag: `sticker-${code}`,
  }
}

export function buildTradePushPayload({
  action,
  actorName,
  friendUsername,
}: {
  action: TradePushAction
  actorName?: string | null
  friendUsername: string
}): PushPayload {
  const actor = actorName?.trim()
  const bodyByAction: Record<TradePushAction, string> = {
    created: actor ? `${actor} te propuso un intercambio` : 'Te propusieron un intercambio',
    accepted: actor ? `${actor} acepto el intercambio` : 'Intercambio aceptado',
    declined: actor ? `${actor} rechazo el intercambio` : 'Intercambio rechazado',
    cancelled: actor ? `${actor} cancelo el intercambio` : 'Intercambio cancelado',
    applied: actor ? `${actor} anoto el intercambio` : 'Intercambio anotado',
  }

  return {
    title: 'Intercambio',
    body: bodyByAction[action],
    url: '/amigos',
    tag: `trade-${friendUsername}-${action}`,
  }
}

export function filterPushRecipients<T extends PushRecipientLike>(recipients: T[], sourceDeviceId?: string | null): T[] {
  return recipients.filter(recipient => recipient.enabled && recipient.device_id !== sourceDeviceId)
}

export function getPushEnvConfig(env: NodeJS.ProcessEnv): PushEnvConfig {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = env.VAPID_PRIVATE_KEY
  const subject = env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) return { configured: false }

  return {
    configured: true,
    publicKey,
    privateKey,
    subject,
  }
}
