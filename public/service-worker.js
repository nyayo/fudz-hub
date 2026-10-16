self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { message: event.data ? event.data.text() : "You have a new Fudz Hub update." };
  }

  const extra = payload.extra || payload.data || {};
  const title = payload.title || "Fudz Hub";
  const body = payload.message || payload.body || payload.notification?.body || "You have a new update.";
  const orderId = extra.order_id || payload.order_id;
  const candidateUrl = extra.url || payload.url || (orderId ? `/orders/${orderId}` : "/");
  let clickUrl = "/";
  try {
    const parsed = new URL(candidateUrl, self.location.origin);
    if (parsed.origin === self.location.origin) clickUrl = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    clickUrl = "/";
  }

  const options = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || (orderId ? `order-${orderId}` : "fudz-hub-update"),
    data: { url: clickUrl },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url || "/";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if ("navigate" in client) await client.navigate(target);
      return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});
