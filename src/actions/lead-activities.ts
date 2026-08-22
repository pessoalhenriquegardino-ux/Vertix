"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";
import { parseDateOnly } from "@/lib/utils";
import type { ActionState } from "@/actions/clients";
import { OUTCOMES } from "@/lib/leads";

const activityTypeEnum = z.enum(["CALL", "WHATSAPP", "EMAIL", "MEETING", "NOTE"]);
const outcomeEnum = z.enum(OUTCOMES);

const registerSchema = z.object({
  pendingActivityId: z.string().optional(),
  actionType: activityTypeEnum,
  outcome: outcomeEnum,
  note: z.string().optional(),
  nextType: activityTypeEnum.optional(),
  nextDate: z.string().optional(),
});

// Registra o resultado de uma ação de cadência (a pendente, se houver, ou uma
// ação avulsa) e, opcionalmente, já agenda o próximo passo da cadência.
export async function registerCadenceOutcome(
  leadId: string,
  basePath: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "Lead não encontrado." };

  const session = await requireClientAccess(lead.clientId);

  const parsed = registerSchema.safeParse({
    pendingActivityId: formData.get("pendingActivityId") || undefined,
    actionType: formData.get("actionType"),
    outcome: formData.get("outcome"),
    note: formData.get("note") || undefined,
    nextType: formData.get("nextType") || undefined,
    nextDate: formData.get("nextDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (parsed.data.pendingActivityId) {
    await prisma.leadActivity.update({
      where: { id: parsed.data.pendingActivityId },
      data: {
        type: parsed.data.actionType,
        outcome: parsed.data.outcome,
        note: parsed.data.note,
        completedAt: new Date(),
      },
    });
  } else {
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: parsed.data.actionType,
        outcome: parsed.data.outcome,
        note: parsed.data.note,
        completedAt: new Date(),
        createdByUserId: session.user.id,
      },
    });
  }

  if (parsed.data.nextDate) {
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: parsed.data.nextType ?? parsed.data.actionType,
        scheduledAt: parseDateOnly(parsed.data.nextDate),
        createdByUserId: session.user.id,
      },
    });
  }

  await prisma.lead.update({ where: { id: leadId }, data: { updatedAt: new Date() } });

  revalidatePath(basePath);
  return { error: undefined };
}

const rescheduleSchema = z.object({
  activityId: z.string().min(1),
  type: activityTypeEnum,
  scheduledAt: z.string().min(1, "Informe a data."),
});

// "Ajustar": reagenda o tipo/data da ação de cadência pendente, sem registrar
// resultado (o histórico não é alterado). O id da atividade pendente vem num
// campo oculto do formulário (só é conhecido em tempo de render no cliente).
export async function rescheduleCadence(
  basePath: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = rescheduleSchema.safeParse({
    activityId: formData.get("activityId"),
    type: formData.get("type"),
    scheduledAt: formData.get("scheduledAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const activity = await prisma.leadActivity.findUnique({
    where: { id: parsed.data.activityId },
    include: { lead: true },
  });
  if (!activity) return { error: "Atividade não encontrada." };

  await requireClientAccess(activity.lead.clientId);

  await prisma.leadActivity.update({
    where: { id: parsed.data.activityId },
    data: { type: parsed.data.type, scheduledAt: parseDateOnly(parsed.data.scheduledAt) },
  });

  revalidatePath(basePath);
  return { error: undefined };
}
