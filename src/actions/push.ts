"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function subscribeToPush(raw: unknown) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autenticado.");

  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Inscrição inválida.");

  const { endpoint, keys } = parsed.data;

  // upsert por endpoint: se o mesmo dispositivo já tinha uma inscrição
  // (chave rotacionada pelo navegador), atualiza em vez de duplicar.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
  });

  return { ok: true };
}

export async function unsubscribeFromPush(endpoint: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autenticado.");

  // só apaga se pertencer ao próprio usuário
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });

  return { ok: true };
}

export async function getPushSubscriptionStatus(endpoint: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { subscribed: false };

  const sub = await prisma.pushSubscription.findFirst({
    where: { endpoint, userId: session.user.id },
    select: { id: true },
  });
  return { subscribed: !!sub };
}
