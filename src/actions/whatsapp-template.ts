"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";
import type { ActionState } from "@/actions/clients";

const templateSchema = z.object({
  template: z.string().max(2000, "Mensagem muito longa (máx. 2000 caracteres).").optional(),
});

export async function updateWhatsappTemplate(
  clientId: string,
  basePath: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireClientAccess(clientId);

  const parsed = templateSchema.safeParse({ template: formData.get("template") || undefined });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { whatsappTemplate: parsed.data.template?.trim() || null },
  });

  revalidatePath(basePath);
  return { error: undefined };
}
