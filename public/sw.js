self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "Tienes una actualización." };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Diario de Turnos", {
      body: data.body || "Tienes una actualización.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/dashboard" },
      tag: data.tag || "diario-turnos",
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
