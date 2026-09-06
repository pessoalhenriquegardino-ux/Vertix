"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";

export async function regenerateApiKey(clientId: string, basePath: string) {
  await requireClientAccess(clientId);
  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { apiKey: `vtx_${crypto.randomBytes(24).toString("hex")}` },
  });
  revalidatePath(basePath);
  return updated.apiKey;
}
