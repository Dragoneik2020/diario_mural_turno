const CACHE_NAME = "diario-turnos-v2";
const RUNTIME_CACHE = "diario-turnos-runtime";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Las APIs (descargas, datos, auth) no se interceptan: deben ir a la red.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (request.destination === "script" || request.destination === "style" || request.destination === "image" || request.destination === "document" || request.destination === "font")) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/", { cacheName: RUNTIME_CACHE })).then((r) => r || Response.error())
      )
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "Tienes una actualizaciÃ³n." };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Diario de Turnos", {
      body: data.body || "Tienes una actualizaciÃ³n.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/dashboard" },
      tag: data.tag || "diario-turnos",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const current = windows.find((client) => "focus" in client);
      if (current) {
        current.navigate(target);
        return current.focus();
      }
      return clients.openWindow(target);
    })
  );
});