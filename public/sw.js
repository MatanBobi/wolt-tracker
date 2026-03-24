// Service worker for receiving push notifications
// Version is updated at build time to trigger SW updates on iOS
// eslint-disable-next-line no-unused-vars
const SW_VERSION = "__SW_VERSION__";
/// <reference lib="webworker" />

// Activate new service worker immediately, critical for iOS PWA updates
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const e = /** @type {PushEvent} */ (event);
  if (!e.data) return;

  const data = e.data.json();

  const options = {
    body: data.body,
    icon: "/wolt-icon.png",
    badge: "/wolt-icon.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
    },
    actions: [
      { action: "open", title: "Open Wolt" },
      { action: "dismiss", title: "Dismiss" },
    ],
    requireInteraction: true,
    tag: "wolt-venue-online",
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  const e = /** @type {NotificationEvent} */ (event);
  e.notification.close();

  if (e.action === "dismiss") return;

  const url = e.notification.data?.url || "/";

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(url);
    })
  );
});
