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

const metaLeadSchema = z.object({
  externalId: z.string().nullable().optional(),
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  source: z.string().optional(),
  createdAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Importa leads vindos de um export de formulário do Meta Lead Ads. Cada
// lead entra na etapa "Nova Conversa" (NEW), com a data real de quando
// preencheu o formulário e as respostas do formulário nas notas. Se já
// existir um lead com o mesmo externalId (reimportação de um export que se
// sobrepõe a um anterior), atualiza em vez de duplicar.
export async function importMetaLeadsCsv(
  clientId: string,
  basePath: string,
  rows: unknown[]
): Promise<ImportResult> {
  const session = await requireClientAccess(clientId);

  const errors: string[] = [];
  const validRows: z.infer<typeof metaLeadSchema>[] = [];

  rows.forEach((row, idx) => {
    const parsed = metaLeadSchema.safeParse(row);
    if (!parsed.success) {
      errors.push(`Linha ${idx + 2}: ${parsed.error.issues[0]?.message ?? "dados inválidos"}`);
      return;
    }
    validRows.push(parsed.data);
  });

  if (validRows.length === 0) {
    return { success: false, imported: 0, errors: errors.length ? errors : ["Nenhuma linha válida encontrada."] };
  }

  let imported = 0;

  for (const row of validRows) {
    const createdAt = row.createdAt ? new Date(row.createdAt) : undefined;
    const data = {
      clientId,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      source: row.source || undefined,
      notes: row.notes || undefined,
      stage: "NEW" as const,
      createdByUserId: session.user.id,
      ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { createdAt } : {}),
    };

    if (row.externalId) {
      await prisma.lead.upsert({
        where: { clientId_externalId: { clientId, externalId: row.externalId } },
        update: { name: data.name, email: data.email, phone: data.phone, notes: data.notes },
        create: { ...data, externalId: row.externalId },
      });
    } else {
      await prisma.lead.create({ data });
    }
    imported++;
  }

  revalidatePath(basePath);

  return { success: true, imported, errors };
}
