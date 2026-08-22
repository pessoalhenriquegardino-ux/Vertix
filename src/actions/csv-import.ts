"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { parseDateOnly } from "@/lib/utils";

const csvRowSchema = z.object({
  date: z.string().min(1),
  ad_spend: z.coerce.number().min(0),
  leads_generated: z.coerce.number().int().min(0),
  leads_in_analysis: z.coerce.number().int().min(0),
  leads_qualified: z.coerce.number().int().min(0),
  leads_proposal: z.coerce.number().int().min(0),
  leads_won: z.coerce.number().int().min(0),
  leads_lost: z.coerce.number().int().min(0),
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;

export type ImportResult = {
  success: boolean;
  imported: number;
  errors: string[];
};

export async function importMetricsCsv(clientId: string, rows: unknown[]): Promise<ImportResult> {
  const session = await requireAdmin();

  const errors: string[] = [];
  const validRows: CsvRowInput[] = [];

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
    validRows.map((row) =>
      prisma.dailyMetric.upsert({
        where: {
          clientId_date_source: {
            clientId,
            date: parseDateOnly(row.date),
            source: "CSV_IMPORT",
          },
        },
        update: {
          adSpend: row.ad_spend,
          leadsGenerated: row.leads_generated,
          leadsInAnalysis: row.leads_in_analysis,
          leadsQualified: row.leads_qualified,
          leadsProposal: row.leads_proposal,
          leadsWon: row.leads_won,
          leadsLost: row.leads_lost,
        },
        create: {
          clientId,
          date: parseDateOnly(row.date),
          adSpend: row.ad_spend,
          leadsGenerated: row.leads_generated,
          leadsInAnalysis: row.leads_in_analysis,
          leadsQualified: row.leads_qualified,
          leadsProposal: row.leads_proposal,
          leadsWon: row.leads_won,
          leadsLost: row.leads_lost,
          source: "CSV_IMPORT",
          createdByUserId: session.user.id,
        },
      })
    )
  );

  revalidatePath(`/admin/clients/${clientId}/dashboard`);
  revalidatePath(`/admin/clients/${clientId}/import`);

  return { success: true, imported: validRows.length, errors };
}
