"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";
import { decryptToken, unsubscribePageFromLeadgen } from "@/lib/meta";

export async function getMetaConnection(clientId: string) {
  return prisma.metaConnection.findUnique({ where: { clientId } });
}

export async function disconnectMeta(clientId: string, basePath: string) {
  await requireClientAccess(clientId);

  const connection = await prisma.metaConnection.findUnique({ where: { clientId } });
  if (!connection) return;

  try {
    const token = decryptToken(connection.encryptedToken);
    await unsubscribePageFromLeadgen(connection.pageId, token);
  } catch {
    // segue com a remoção local mesmo se a chamada ao Meta falhar
  }

  await prisma.metaConnection.delete({ where: { clientId } });
  revalidatePath(basePath);
}
