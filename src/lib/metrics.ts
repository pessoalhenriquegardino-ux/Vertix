import { prisma } from "@/lib/prisma";
import { parseDateOnly, toDateInputValue } from "@/lib/utils";
import { STAGES, type Stage } from "@/lib/leads";

export type PeriodRange = { from: Date; to: Date };

export function resolvePeriod(fromParam?: string, toParam?: string): PeriodRange {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const to = toParam ? parseDateOnly(toParam) : today;
  const defaultFrom = new Date(to);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const from = fromParam ? parseDateOnly(fromParam) : defaultFrom;

  return { from, to };
}

export function previousPeriod({ from, to }: PeriodRange): PeriodRange {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const prevTo = new Date(from);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (days - 1));
  return { from: prevFrom, to: prevTo };
}

export type MetricTotals = {
  adSpend: number;
  leadsGenerated: number;
  leadsInAnalysis: number;
  leadsQualified: number;
  leadsProposal: number;
  leadsWon: number;
  leadsLost: number;
};

const emptyTotals: MetricTotals = {
  adSpend: 0,
  leadsGenerated: 0,
  leadsInAnalysis: 0,
  leadsQualified: 0,
  leadsProposal: 0,
  leadsWon: 0,
  leadsLost: 0,
};

// LEGADO: lançamentos manuais/CSV do pipeline (DailyMetric). O dashboard
// principal não usa mais isso como fonte (ver getPipelineRowsFromCrm) — só
// segue disponível pra quem ainda lança manualmente via "Lançar dados"/
// "Importar CSV" no pipeline, útil pra reconstruir histórico anterior ao
// uso do CRM.
export async function getMetricsInRange(clientId: string, range: PeriodRange) {
  const endInclusive = new Date(range.to);
  endInclusive.setUTCHours(23, 59, 59, 999);

  const rows = await prisma.dailyMetric.findMany({
    where: {
      clientId,
      date: { gte: range.from, lte: endInclusive },
    },
    orderBy: { date: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    date: toDateInputValue(r.date),
    adSpend: Number(r.adSpend),
    leadsGenerated: r.leadsGenerated,
    leadsInAnalysis: r.leadsInAnalysis,
    leadsQualified: r.leadsQualified,
    leadsProposal: r.leadsProposal,
    leadsWon: r.leadsWon,
    leadsLost: r.leadsLost,
    source: r.source,
    notes: r.notes,
  }));
}

type SummableRow = {
  adSpend: number;
  leadsGenerated: number;
  leadsInAnalysis: number;
  leadsQualified: number;
  leadsProposal: number;
  leadsWon: number;
  leadsLost: number;
};

export function sumTotals(rows: SummableRow[]): MetricTotals {
  return rows.reduce<MetricTotals>(
    (acc, r) => ({
      adSpend: acc.adSpend + r.adSpend,
      leadsGenerated: acc.leadsGenerated + r.leadsGenerated,
      leadsInAnalysis: acc.leadsInAnalysis + r.leadsInAnalysis,
      leadsQualified: acc.leadsQualified + r.leadsQualified,
      leadsProposal: acc.leadsProposal + r.leadsProposal,
      leadsWon: acc.leadsWon + r.leadsWon,
      leadsLost: acc.leadsLost + r.leadsLost,
    }),
    { ...emptyTotals }
  );
}

// Etapas do funil (fora "Nova Conversa", que representa o total de leads
// que entraram no período — cada lead conta uma vez ali, e mais uma vez na
// coluna da etapa atual em que se encontra).
const STAGE_FIELD: Partial<Record<Stage, keyof MetricTotals>> = {
  IN_ANALYSIS: "leadsInAnalysis",
  QUALIFIED: "leadsQualified",
  PROPOSAL: "leadsProposal",
  WON: "leadsWon",
  LOST: "leadsLost",
};

type PipelineRow = {
  id: string;
  date: string;
  adSpend: number;
  leadsGenerated: number;
  leadsInAnalysis: number;
  leadsQualified: number;
  leadsProposal: number;
  leadsWon: number;
  leadsLost: number;
  source: string;
  notes: string | null;
};

function emptyRow(dateKey: string): PipelineRow {
  return {
    id: dateKey,
    date: dateKey,
    adSpend: 0,
    leadsGenerated: 0,
    leadsInAnalysis: 0,
    leadsQualified: 0,
    leadsProposal: 0,
    leadsWon: 0,
    leadsLost: 0,
    source: "CRM",
    notes: null,
  };
}

// Pipeline real: gasto vem das Campanhas (mesma fonte da aba Campanhas) e as
// contagens do funil vêm dos Leads reais do CRM — assim os números batem
// entre as três abas em vez de depender de lançamento manual duplicado.
// "Nova Conversa" = total de leads que entraram no período (independente da
// etapa atual); as demais colunas contam quantos desses leads estão hoje em
// cada etapa.
async function getPipelineRowsFromCrm(clientId: string, range: PeriodRange): Promise<PipelineRow[]> {
  const endInclusive = new Date(range.to);
  endInclusive.setUTCHours(23, 59, 59, 999);

  const [leads, campaignRows] = await Promise.all([
    prisma.lead.findMany({
      where: { clientId, createdAt: { gte: range.from, lte: endInclusive } },
      select: { createdAt: true, stage: true },
    }),
    prisma.campaignMetric.findMany({
      where: { clientId, date: { gte: range.from, lte: endInclusive } },
      select: { date: true, amountSpent: true },
    }),
  ]);

  const byDate = new Map<string, PipelineRow>();
  const ensure = (key: string) => byDate.get(key) ?? (byDate.set(key, emptyRow(key)), byDate.get(key)!);

  for (const c of campaignRows) {
    const row = ensure(toDateInputValue(c.date));
    row.adSpend += Number(c.amountSpent);
  }

  for (const lead of leads) {
    const key = toDateInputValue(lead.createdAt);
    const row = ensure(key);
    row.leadsGenerated += 1;
    const field = STAGE_FIELD[lead.stage as Stage];
    if (field) (row[field] as number) += 1;
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function getDashboardData(clientId: string, fromParam?: string, toParam?: string) {
  const range = resolvePeriod(fromParam, toParam);
  const prevRange = previousPeriod(range);

  const [rows, prevRows] = await Promise.all([
    getPipelineRowsFromCrm(clientId, range),
    getPipelineRowsFromCrm(clientId, prevRange),
  ]);

  return {
    range,
    prevRange,
    rows,
    totals: sumTotals(rows),
    prevTotals: sumTotals(prevRows),
  };
}
