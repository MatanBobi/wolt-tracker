// Service worker for receiving push notifications
/// <reference lib="webworker" />

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
