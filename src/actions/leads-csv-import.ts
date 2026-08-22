"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/require-access";
import type { ImportResult } from "@/actions/csv-import";
import { STAGES } from "@/lib/leads";

const csvRowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  source: z.string().optional(),
  stage: z.enum(STAGES).optional(),
  value: z.coerce.number().min(0).optional(),
});

export async function importLeadsCsv(clientId: string, basePath: string, rows: unknown[]): Promise<ImportResult> {
  const session = await requireClientAccess(clientId);

  const errors: string[] = [];
  const validRows: z.infer<typeof csvRowSchema>[] = [];

  rows.forEach((row, idx) => {
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push(`Linha ${idx + 2}: ${parsed.error.issues[0]?.message ?? "dados inválidos"}`);
      return;
    }
    validRows.push(parsed.data);
  });

  if (validRows.length === 0) {
    return { success: false, imported: 0, errors: errors.length ? errors : ["Nenhuma linha válida encontrada."] };
  }

  await prisma.lead.createMany({
    data: validRows.map((row) => ({
      clientId,
      name: row.name,
      phone: row.phone || undefined,
      email: row.email || undefined,
      source: row.source || undefined,
      stage: row.stage ?? "NEW",
      value: row.value,
      createdByUserId: session.user.id,
    })),
  });

  revalidatePath(basePath);

  return { success: true, imported: validRows.length, errors };
}
