"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { parseDateOnly } from "@/lib/utils";
import type { ImportResult } from "@/actions/csv-import";

// Formato esperado (exporte do Meta Ads Manager e renomeie as colunas, ou use
// o modelo em exemplo-importacao-campanhas.csv):
const csvRowSchema = z.object({
  date: z.string().min(1),
  campaign_name: z.string().min(1).default("Geral"),
  amount_spent: z.coerce.number().min(0),
  impressions: z.coerce.number().int().min(0),
  clicks: z.coerce.number().int().min(0),
  results: z.coerce.number().int().min(0),
  reach: z.coerce.number().int().min(0).optional(),
  frequency: z.coerce.number().min(0).optional(),
});

export async function importCampaignCsv(clientId: string, rows: unknown[]): Promise<ImportResult> {
  const session = await requireAdmin();

  const errors: string[] = [];
  const validRows: z.infer<typeof csvRowSchema>[] = [];

  rows.forEach((row, idx) => {
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push(`Linha ${idx + 2}: ${parsed.error.issues[0]?.message ?? "dados inválidos"}`);
      return;
    }
    if (Number.isNaN(parseDateOnly(parsed.data.date).getTime())) {
      errors.push(`Linha ${idx + 2}: data inválida (${parsed.data.date}).`);
      return;
    }
    validRows.push(parsed.data);
  });

  if (validRows.length === 0) {
    return { success: false, imported: 0, errors: errors.length ? errors : ["Nenhuma linha válida encontrada."] };
  }

  await prisma.$transaction(
    validRows.map((row) => {
      const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
      const cpc = row.clicks > 0 ? row.amount_spent / row.clicks : 0;
      const cpm = row.impressions > 0 ? (row.amount_spent / row.impressions) * 1000 : 0;
      const costPerResult = row.results > 0 ? row.amount_spent / row.results : 0;
      const date = parseDateOnly(row.date);

      return prisma.campaignMetric.upsert({
        where: {
          clientId_date_campaignName_source: {
            clientId,
            date,
            campaignName: row.campaign_name,
            source: "CSV_IMPORT",
          },
        },
        update: {
          amountSpent: row.amount_spent,
          impressions: row.impressions,
          clicks: row.clicks,
          results: row.results,
          reach: row.reach,
          frequency: row.frequency,
          ctr,
          cpc,
          cpm,
          costPerResult,
        },
        create: {
          clientId,
          date,
          campaignName: row.campaign_name,
          amountSpent: row.amount_spent,
          impressions: row.impressions,
          clicks: row.clicks,
          results: row.results,
          reach: row.reach,
          frequency: row.frequency,
          ctr,
          cpc,
          cpm,
          costPerResult,
          source: "CSV_IMPORT",
          createdByUserId: session.user.id,
        },
      });
    })
  );

  revalidatePath(`/admin/clients/${clientId}/campaigns`);

  return { success: true, imported: validRows.length, errors };
}
