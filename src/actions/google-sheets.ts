"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";
import { extractSheetId, testSheetAccess } from "@/lib/google-sheets";
import { syncLeadsFromGoogleSheet } from "@/lib/google-sheets-sync";
import type { ActionState } from "@/actions/clients";

export async function connectGoogleSheet(
  clientId: string,
  basePath: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireClientAccess(clientId);

  const rawUrl = String(formData.get("sheetUrl") || "").trim();
  const sheetId = extractSheetId(rawUrl);
  if (!sheetId) {
    return { error: "Não reconheci essa URL de planilha. Copie o link completo da planilha do Google." };
  }

  const access = await testSheetAccess(sheetId);
  if (!access.ok) {
    return {
      error: `Não consegui acessar a planilha: ${access.error}. Confirma que ela foi compartilhada com a conta de serviço.`,
    };
  }

  await prisma.googleSheetConnection.upsert({
    where: { clientId },
    update: { sheetId, connectedByUserId: session.user.id, lastSyncError: null },
    create: { clientId, sheetId, connectedByUserId: session.user.id },
  });

  revalidatePath(basePath);

  // primeira sincronização já na hora, pra não deixar o usuário esperando
  // até a próxima rodada automática pra ver algo acontecer.
  await syncLeadsFromGoogleSheet(clientId);
  revalidatePath(basePath);

  return { error: undefined };
}

export async function disconnectGoogleSheet(clientId: string, basePath: string) {
  await requireClientAccess(clientId);
  await prisma.googleSheetConnection.deleteMany({ where: { clientId } });
  revalidatePath(basePath);
}

export async function syncGoogleSheetNow(clientId: string, basePath: string) {
  await requireClientAccess(clientId);
  const result = await syncLeadsFromGoogleSheet(clientId);
  revalidatePath(basePath);
  return result;
}

export async function getGoogleSheetConnection(clientId: string) {
  return prisma.googleSheetConnection.findUnique({ where: { clientId } });
}
