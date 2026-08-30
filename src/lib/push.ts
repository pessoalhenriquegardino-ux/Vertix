import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) return; // não configurado — silenciosamente não envia
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

async function sendToSubscriptions(subs: { id: string; endpoint: string; p256dh: string; auth: string }[], payload: PushPayload) {
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("push notification failed", err?.statusCode, err?.body);
        }
      }
    })
  );
}

// Manda a notificação pra todos os dispositivos em que os usuários daquele
// cliente (CLIENT) ativaram push, e também pra todos os ADMIN da agência
// (a mensagem do admin inclui o nome do cliente, já que ele acompanha
// vários). Remove inscrições mortas (410/404) que encontrar pelo caminho.
// Nunca lança erro — notificação é "best effort", não pode derrubar o
// fluxo principal (criar o lead) se falhar.
export async function notifyClientNewLead(clientId: string, leadName: string, extra?: string) {
  try {
    ensureConfigured();
    if (!configured) return;

    const [client, clientUsers, adminUsers] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { name: true } }),
      prisma.user.findMany({ where: { clientId, role: "CLIENT" }, select: { id: true } }),
      prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    ]);

    const clientUserIds = clientUsers.map((u) => u.id);
    const adminUserIds = adminUsers.map((u) => u.id);

    const [clientSubs, adminSubs] = await Promise.all([
      clientUserIds.length
        ? prisma.pushSubscription.findMany({ where: { userId: { in: clientUserIds } } })
        : Promise.resolve([]),
      adminUserIds.length
        ? prisma.pushSubscription.findMany({ where: { userId: { in: adminUserIds } } })
        : Promise.resolve([]),
    ]);

    const tasks: Promise<void>[] = [];

    if (clientSubs.length > 0) {
      tasks.push(
        sendToSubscriptions(clientSubs, {
          title: "Novo lead! 🎉",
          body: extra ? `${leadName} — ${extra}` : leadName,
          url: "/crm",
        })
      );
    }

    if (adminSubs.length > 0) {
      const clientName = client?.name ?? "Cliente";
      tasks.push(
        sendToSubscriptions(adminSubs, {
          title: `Novo lead — ${clientName}`,
          body: extra ? `${leadName} — ${extra}` : leadName,
          url: `/admin/clients/${clientId}/crm`,
        })
      );
    }

    await Promise.all(tasks);
  } catch (err) {
    console.error("notifyClientNewLead error", err);
  }
}
