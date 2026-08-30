// Service Worker responsável só pelas notificações push. Não faz cache de
// nada — se algum dia adicionarmos um app shell/offline, isso entra aqui.

self.addEventListener("push", (event) => {
  let data = { title: "Novo lead!", body: "Você tem um novo lead no CRM.", url: "/crm" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    // payload não era JSON — mantém o texto default
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/crm" },
    })
  );
});

// Ao clicar na notificação: foca uma aba já aberta no CRM, ou abre uma nova.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/crm";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
