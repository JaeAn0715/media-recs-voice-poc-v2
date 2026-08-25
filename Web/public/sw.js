self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || '지하철 알림', {
      body: data.body || '목적지까지 1역 남았습니다.',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((client) => 'focus' in client)
        if (existing) {
          existing.navigate?.(url)
          return existing.focus()
        }
        return self.clients.openWindow(url)
      }),
  )
})
