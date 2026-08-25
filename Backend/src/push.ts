import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

export type PushSubscriptionJSON = {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
}

type VapidKeys = {
  publicKey: string
  privateKey: string
  subject: string
}

const vapidPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.vapid.json',
)

const loadVapidKeys = (): VapidKeys => {
  const subject = process.env.VAPID_SUBJECT || 'mailto:subway-tracker@localhost'
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject,
    }
  }

  if (existsSync(vapidPath)) {
    const stored = JSON.parse(readFileSync(vapidPath, 'utf8')) as VapidKeys
    return { ...stored, subject: stored.subject || subject }
  }

  const generated = webpush.generateVAPIDKeys()
  const keys = { ...generated, subject }
  writeFileSync(vapidPath, JSON.stringify(keys, null, 2))
  return keys
}

const vapid = loadVapidKeys()

webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

export const getVapidPublicKey = () => vapid.publicKey

export const isPushSubscription = (
  value: unknown,
): value is PushSubscriptionJSON => {
  if (!value || typeof value !== 'object') return false
  const subscription = value as PushSubscriptionJSON
  return Boolean(
    subscription.endpoint &&
      subscription.keys?.p256dh &&
      subscription.keys.auth,
  )
}

export const sendPush = async (
  subscription: PushSubscriptionJSON,
  payload: { title: string; body: string; url?: string },
) => {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh ?? '',
        auth: subscription.keys?.auth ?? '',
      },
    },
    JSON.stringify(payload),
  )
}
