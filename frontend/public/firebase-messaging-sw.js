// Firebase Messaging Service Worker for background push alerts
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js")

self.addEventListener("push", function (event) {
  if (event.data) {
    const payload = event.data.json()
    const title = payload.notification?.title || "SmartQueue Alert"
    const options = {
      body: payload.notification?.body || "Your queue status has been updated.",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: payload.data || {},
    }
    event.waitUntil(self.registration.showNotification(title, options))
  }
})

self.addEventListener("notificationclick", function (event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/")
      }
    })
  )
})
