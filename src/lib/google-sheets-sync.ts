import { prisma } from "@/lib/prisma";
import { detectMetaLeadsFormat, mapMetaLeadsRows } from "@/lib/meta-leads-csv";
import { readSheet, rowsToRecords, ensureStatusColumn, writeStatusCell } from "@/lib/google-sheets";
import { notifyClientNewLead } from "@/lib/push";
import { STAGE_LABELS, type Stage } from "@/lib/leads";

export type SyncResult = { imported: number; error?: string };

// Importa os leads novos da planilha conectada de um cliente. Mesma lógica
// de detecção/mapeamento usada no import de CSV do Meta Lead Ads — a
// planilha tem exatamente as mesmas colunas (é o mesmo dado, só entregue
// de outro jeito). Dedupe por externalId, igual ao CSV e ao webhook.
export async function syncLeadsFromGoogleSheet(clientId: string): Promise<SyncResult> {
  const connection = await prisma.googleSheetConnection.findUnique({ where: { clientId } });
  if (!connection) return { imported: 0, error: "Planilha não conectada." };

  try {
    const { header, rows } = await readSheet(connection.sheetId, connection.sheetTab);
    const records = rowsToRecords(header, rows);
    const detection = detectMetaLeadsFormat(header);
    const normalized = mapMetaLeadsRows(records, detection);

    let createdCount = 0;

    for (const row of normalized) {
      const createdAt = row.createdAt ? new Date(row.createdAt) : undefined;
      const data = {
        clientId,
        name: row.name,
        email: row.email || undefined,
        phone: row.phone || undefined,
        source: row.source || undefined,
        notes: row.notes || undefined,
        stage: "NEW" as const,
        createdByUserId: connection.connectedByUserId,
        ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { createdAt } : {}),
      };

      if (row.externalId) {
        const existing = await prisma.lead.findUnique({
          where: { clientId_externalId: { clientId, externalId: row.externalId } },
          select: { id: true },
        });
        if (!existing) createdCount++;
        await prisma.lead.upsert({
          where: { clientId_externalId: { clientId, externalId: row.externalId } },
          update: { name: data.name, email: data.email, phone: data.phone, notes: data.notes },
          create: { ...data, externalId: row.externalId },
        });
      } else {
        // sem id na planilha (cliente removeu a coluna, ex.) — não dá pra
        // deduplicar com segurança, então pula em vez de arriscar duplicar
        // a cada sincronização.
        continue;
      }
    }

    await prisma.googleSheetConnection.update({
      where: { clientId },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });

    if (createdCount > 0) {
      await notifyClientNewLead(clientId, `${createdCount} novo(s) lead(s)`, "Planilha Google");
    }

    return { imported: createdCount };
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Erro desconhecido ao sincronizar a planilha.";
    await prisma.googleSheetConnection.update({
      where: { clientId },
      data: { lastSyncError: message },
    });
    return { imported: 0, error: message };
  }
}

// Escreve o status do funil de volta na planilha, na linha do lead que
// mudou de etapa — best effort, nunca lança erro (não pode travar a troca
// de etapa no CRM se a planilha falhar).
export async function syncLeadStatusToSheet(clientId: string, leadExternalId: string | null, stage: Stage) {
  if (!leadExternalId) return;

  try {
    const connection = await prisma.googleSheetConnection.findUnique({ where: { clientId } });
    if (!connection) return;

    const { header, rows } = await readSheet(connection.sheetId, connection.sheetTab);
    const detection = detectMetaLeadsFormat(header);
    if (!detection.idCol) return; // sem coluna de id, não dá pra achar a linha com segurança

    const idColIndex = header.findIndex((h) => h === detection.idCol);
    if (idColIndex < 0) return;

    const dataRowIndex = rows.findIndex((r) => (r[idColIndex] ?? "").trim() === leadExternalId);
    if (dataRowIndex < 0) return; // lead não veio dessa planilha (ex: criado manualmente)

    let statusColumnLetter = connection.statusColumnLetter;
    if (!statusColumnLetter) {
      statusColumnLetter = await ensureStatusColumn(connection.sheetId, connection.sheetTab, header);
      await prisma.googleSheetConnection.update({
        where: { clientId },
        data: { statusColumnLetter },
      });
    }

    await writeStatusCell(connection.sheetId, connection.sheetTab, statusColumnLetter, dataRowIndex, STAGE_LABELS[stage]);
  } catch (err) {
    console.error("syncLeadStatusToSheet error", err);
  }
}
