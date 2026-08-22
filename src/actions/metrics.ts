"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { parseDateOnly } from "@/lib/utils";
import type { ActionState } from "@/actions/clients";

const entrySchema = z.object({
  date: z.string().min(1, "Informe a data."),
  adSpend: z.coerce.number().min(0),
  leadsGenerated: z.coerce.number().int().min(0),
  leadsInAnalysis: z.coerce.number().int().min(0),
  leadsQualified: z.coerce.number().int().min(0),
  leadsProposal: z.coerce.number().int().min(0),
  leadsWon: z.coerce.number().int().min(0),
  leadsLost: z.coerce.number().int().min(0),
  notes: z.string().optional(),
});

export async function upsertManualMetric(
  clientId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = entrySchema.safeParse({
    date: formData.get("date"),
    adSpend: formData.get("adSpend"),
    leadsGenerated: formData.get("leadsGenerated"),
    leadsInAnalysis: formData.get("leadsInAnalysis"),
    leadsQualified: formData.get("leadsQualified"),
    leadsProposal: formData.get("leadsProposal"),
    leadsWon: formData.get("leadsWon"),
    leadsLost: formData.get("leadsLost"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const date = parseDateOnly(parsed.data.date);

  await prisma.dailyMetric.upsert({
    where: {
      clientId_date_source: {
        clientId,
        date,
        source: "MANUAL",
      },
    },
    update: {
      adSpend: parsed.data.adSpend,
      leadsGenerated: parsed.data.leadsGenerated,
      leadsInAnalysis: parsed.data.leadsInAnalysis,
      leadsQualified: parsed.data.leadsQualified,
      leadsProposal: parsed.data.leadsProposal,
      leadsWon: parsed.data.leadsWon,
      leadsLost: parsed.data.leadsLost,
      notes: parsed.data.notes,
    },
    create: {
      clientId,
      date,
      adSpend: parsed.data.adSpend,
      leadsGenerated: parsed.data.leadsGenerated,
      leadsInAnalysis: parsed.data.leadsInAnalysis,
      leadsQualified: parsed.data.leadsQualified,
      leadsProposal: parsed.data.leadsProposal,
      leadsWon: parsed.data.leadsWon,
      leadsLost: parsed.data.leadsLost,
      notes: parsed.data.notes,
      source: "MANUAL",
      createdByUserId: session.user.id,
    },
  });

  revalidatePath(`/admin/clients/${clientId}/dashboard`);
  revalidatePath(`/admin/clients/${clientId}/entry`);
  return { error: undefined };
}
