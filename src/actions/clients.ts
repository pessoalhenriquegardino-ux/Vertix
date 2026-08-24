"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const clientSchema = z.object({
  name: z.string().min(2, "Informe o nome do cliente."),
  segment: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export type ActionState = { error?: string } | undefined;

export async function createClient(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    segment: formData.get("segment") || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      segment: parsed.data.segment,
      active: parsed.data.active ?? true,
    },
  });

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClient(clientId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    segment: formData.get("segment") || undefined,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: parsed.data.name,
      segment: parsed.data.segment,
      active: parsed.data.active ?? true,
    },
  });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  return { error: undefined };
}

// Exclui o cliente e tudo que está ligado a ele (usuários, métricas de
// pipeline/campanhas, leads e cadência) — a exclusão é definitiva.
export async function deleteClient(clientId: string) {
  await requireAdmin();
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/admin/clients");
}
