const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export const registerPushSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return undefined
  }

  const keyResponse = await fetch('/api/push/vapid-key')
  if (!keyResponse.ok) return undefined
  const { publicKey } = (await keyResponse.json()) as { publicKey?: string }
  if (!publicKey) return undefined

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return undefined

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  return subscription.toJSON()
}
