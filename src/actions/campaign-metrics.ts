"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { parseDateOnly } from "@/lib/utils";
import type { ActionState } from "@/actions/clients";

const entrySchema = z.object({
  date: z.string().min(1, "Informe a data."),
  campaignName: z.string().min(1).default("Geral"),
  amountSpent: z.coerce.number().min(0),
  impressions: z.coerce.number().int().min(0),
  clicks: z.coerce.number().int().min(0),
  results: z.coerce.number().int().min(0),
  reach: z.coerce.number().int().min(0).optional(),
  frequency: z.coerce.number().min(0).optional(),
});

function computeDerived(input: {
  amountSpent: number;
  impressions: number;
  clicks: number;
  results: number;
}) {
  return {
    ctr: input.impressions > 0 ? (input.clicks / input.impressions) * 100 : 0,
    cpc: input.clicks > 0 ? input.amountSpent / input.clicks : 0,
    cpm: input.impressions > 0 ? (input.amountSpent / input.impressions) * 1000 : 0,
    costPerResult: input.results > 0 ? input.amountSpent / input.results : 0,
  };
}

export async function upsertManualCampaignMetric(
  clientId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = entrySchema.safeParse({
    date: formData.get("date"),
    campaignName: formData.get("campaignName") || "Geral",
    amountSpent: formData.get("amountSpent"),
    impressions: formData.get("impressions"),
    clicks: formData.get("clicks"),
    results: formData.get("results"),
    reach: formData.get("reach") || undefined,
    frequency: formData.get("frequency") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const date = parseDateOnly(parsed.data.date);
  const derived = computeDerived(parsed.data);

  await prisma.campaignMetric.upsert({
    where: {
      clientId_date_campaignName_source: {
        clientId,
        date,
        campaignName: parsed.data.campaignName,
        source: "MANUAL",
      },
    },
    update: {
      amountSpent: parsed.data.amountSpent,
      impressions: parsed.data.impressions,
      clicks: parsed.data.clicks,
      results: parsed.data.results,
      reach: parsed.data.reach,
      frequency: parsed.data.frequency,
      ...derived,
    },
    create: {
      clientId,
      date,
      campaignName: parsed.data.campaignName,
      amountSpent: parsed.data.amountSpent,
      impressions: parsed.data.impressions,
      clicks: parsed.data.clicks,
      results: parsed.data.results,
      reach: parsed.data.reach,
      frequency: parsed.data.frequency,
      ...derived,
      source: "MANUAL",
      createdByUserId: session.user.id,
    },
  });

  revalidatePath(`/admin/clients/${clientId}/campaigns`);
  return { error: undefined };
}
