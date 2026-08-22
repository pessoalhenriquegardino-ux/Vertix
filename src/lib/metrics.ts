import { prisma } from "@/lib/prisma";
import { parseDateOnly, toDateInputValue } from "@/lib/utils";

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

export function sumTotals(rows: Awaited<ReturnType<typeof getMetricsInRange>>): MetricTotals {
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

export async function getDashboardData(clientId: string, fromParam?: string, toParam?: string) {
  const range = resolvePeriod(fromParam, toParam);
  const prevRange = previousPeriod(range);

  const [rows, prevRows] = await Promise.all([
    getMetricsInRange(clientId, range),
    getMetricsInRange(clientId, prevRange),
  ]);

  return {
    range,
    prevRange,
    rows,
    totals: sumTotals(rows),
    prevTotals: sumTotals(prevRows),
  };
}
