"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";

export async function regenerateWebhookToken(clientId: string, basePath: string) {
  await requireClientAccess(clientId);
  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { webhookToken: crypto.randomUUID().replace(/-/g, "") },
  });
  revalidatePath(basePath);
  return updated.webhookToken;
}
