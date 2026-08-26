"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";
import type { ActionState } from "@/actions/clients";
import { STAGES } from "@/lib/leads";

const leadSchema = z.object({
  name: z.string().min(2, "Informe o nome do lead."),
  phone: z.string().optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  source: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function createLead(
  clientId: string,
  basePath: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireClientAccess(clientId);

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    source: formData.get("source") || undefined,
    value: formData.get("value") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.lead.create({
    data: {
      clientId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      source: parsed.data.source,
      value: parsed.data.value,
      notes: parsed.data.notes,
      createdByUserId: session.user.id,
    },
  });

  revalidatePath(basePath);
  return { error: undefined };
}

const stageEnum = z.enum(STAGES);

// value: só relevante ao mover para WON — é o valor do contrato fechado,
// usado no cálculo de receita/ROAS nas Campanhas. Se omitido ao mover pra
// WON, o valor do lead não é alterado (fica o que já tinha, ou vazio).
export async function updateLeadStage(leadId: string, stage: string, value?: number) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead não encontrado.");

  await requireClientAccess(lead.clientId);

  const parsedStage = stageEnum.safeParse(stage);
  if (!parsedStage.success) throw new Error("Etapa inválida.");

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      stage: parsedStage.data,
      ...(parsedStage.data === "WON" && typeof value === "number" && value >= 0 ? { value } : {}),
    },
  });

  revalidatePath(`/crm`);
  revalidatePath(`/admin/clients/${lead.clientId}/crm`);
}

export async function deleteLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead não encontrado.");

  await requireClientAccess(lead.clientId);

  await prisma.lead.delete({ where: { id: leadId } });

  revalidatePath(`/crm`);
  revalidatePath(`/admin/clients/${lead.clientId}/crm`);
}
