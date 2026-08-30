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

// Manda a notificação pra todos os dispositivos em que os usuários (CLIENT)
// daquele cliente ativaram push. Remove inscrições mortas (410/404) que
// encontrar pelo caminho. Nunca lança erro — notificação é "best effort",
// não pode derrubar o fluxo principal (criar o lead) se falhar.
export async function notifyClientNewLead(clientId: string, leadName: string, extra?: string) {
  try {
    ensureConfigured();
    if (!configured) return;

    const users = await prisma.user.findMany({ where: { clientId, role: "CLIENT" }, select: { id: true } });
    if (users.length === 0) return;

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
    if (subs.length === 0) return;

    const payload: PushPayload = {
      title: "Novo lead! 🎉",
      body: extra ? `${leadName} — ${extra}` : leadName,
      url: "/crm",
    };

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
  } catch (err) {
    console.error("notifyClientNewLead error", err);
  }
}
