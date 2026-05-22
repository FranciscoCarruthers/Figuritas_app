'use client'

import type { Session } from '@supabase/supabase-js'
import type { TradePushAction } from '@/lib/push'

const PUSH_DEVICE_ID_KEY = 'figuritasapp:push-device-id'
const PUSH_ENABLED_KEY = 'figuritasapp:push-enabled'

export type PushCapability =
  | { supported: true; installed: boolean; reason: null }
  | { supported: false; installed: boolean; reason: string }

function getLocalStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function getPushDeviceId(): string {
  const storage = getLocalStorage()
  const existing = storage?.getItem(PUSH_DEVICE_ID_KEY)
  if (existing) return existing

  const next = crypto.randomUUID()
  storage?.setItem(PUSH_DEVICE_ID_KEY, next)
  return next
}

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true
}

function isAppleMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function getPushCapability(): PushCapability {
  const installed = isPwaInstalled()

  if (typeof window === 'undefined') {
    return { supported: false, installed, reason: 'Las notificaciones se activan desde el navegador.' }
  }
  if (!('Notification' in window)) {
    return { supported: false, installed, reason: 'Este navegador no soporta notificaciones push.' }
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, installed, reason: 'Este navegador no soporta Web Push.' }
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return { supported: false, installed, reason: 'Falta configurar la clave publica de notificaciones.' }
  }
  if (!installed && isAppleMobileBrowser()) {
    return {
      supported: false,
      installed,
      reason: 'En iPhone, abrila desde el icono agregado a inicio para activar notificaciones.',
    }
  }

  return { supported: true, installed, reason: null }
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const output = new Uint8Array(buffer)
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }
  return output
}

async function postPushJson(session: Session, url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'No se pudo completar la accion.' }))
    throw new Error(payload.error ?? 'No se pudo completar la accion.')
  }

  return response.json().catch(() => ({ ok: true }))
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export function isPushMarkedEnabled(): boolean {
  return getLocalStorage()?.getItem(PUSH_ENABLED_KEY) === '1'
}

export async function subscribeToPush(session: Session) {
  const capability = getPushCapability()
  if (!capability.supported) throw new Error(capability.reason)

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'El permiso de notificaciones esta bloqueado en el sistema.'
      : 'No se activaron las notificaciones.')
  }

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''),
  })

  await postPushJson(session, '/api/push/subscribe', {
    deviceId: getPushDeviceId(),
    subscription: subscription.toJSON(),
    preferences: {
      trades: true,
      stickerUpdates: true,
    },
  })

  getLocalStorage()?.setItem(PUSH_ENABLED_KEY, '1')
  return subscription
}

export async function unsubscribeFromPush(session: Session) {
  const subscription = await getCurrentPushSubscription()
  await subscription?.unsubscribe()
  await postPushJson(session, '/api/push/unsubscribe', {
    deviceId: getPushDeviceId(),
    endpoint: subscription?.endpoint,
  })
  getLocalStorage()?.removeItem(PUSH_ENABLED_KEY)
}

export async function notifyStickerUpdated(session: Session | null, input: { code: string; quantity: number }) {
  if (!session || !isPushMarkedEnabled()) return
  await postPushJson(session, '/api/push/events/sticker-updated', {
    deviceId: getPushDeviceId(),
    code: input.code,
    quantity: input.quantity,
  }).catch(() => null)
}

export async function notifyTradeEvent(session: Session | null, input: { proposalId: string; action: TradePushAction }) {
  if (!session) return
  await postPushJson(session, '/api/push/events/trade', input).catch(() => null)
}
