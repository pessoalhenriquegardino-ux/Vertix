import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/utils";
import type { PeriodRange } from "@/lib/metrics";

export type CampaignRow = {
  id: string;
  date: string;
  campaignName: string;
  amountSpent: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number | null;
  frequency: number | null;
  results: number;
  costPerResult: number;
  source: string;
};

export async function getCampaignMetricsInRange(clientId: string, range: PeriodRange) {
  const endInclusive = new Date(range.to);
  endInclusive.setUTCHours(23, 59, 59, 999);

  const rows = await prisma.campaignMetric.findMany({
    where: { clientId, date: { gte: range.from, lte: endInclusive } },
    orderBy: { date: "asc" },
  });

  return rows.map<CampaignRow>((r) => ({
    id: r.id,
    date: toDateInputValue(r.date),
    campaignName: r.campaignName,
    amountSpent: Number(r.amountSpent),
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: Number(r.ctr),
    cpc: Number(r.cpc),
    cpm: Number(r.cpm),
    reach: r.reach,
    frequency: r.frequency ? Number(r.frequency) : null,
    results: r.results,
    costPerResult: Number(r.costPerResult),
    source: r.source,
  }));
}

export type CampaignTotals = {
  amountSpent: number;
  impressions: number;
  clicks: number;
  ctr: number; // média ponderada (clicks/impressions)
  cpc: number; // média ponderada (spend/clicks)
  cpm: number; // média ponderada (spend/impressions*1000)
  results: number;
  costPerResult: number; // média ponderada (spend/results)
};

export function sumCampaignTotals(rows: CampaignRow[]): CampaignTotals {
  const amountSpent = rows.reduce((a, r) => a + r.amountSpent, 0);
  const impressions = rows.reduce((a, r) => a + r.impressions, 0);
  const clicks = rows.reduce((a, r) => a + r.clicks, 0);
  const results = rows.reduce((a, r) => a + r.results, 0);

  return {
    amountSpent,
    impressions,
    clicks,
    results,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? amountSpent / clicks : 0,
    cpm: impressions > 0 ? (amountSpent / impressions) * 1000 : 0,
    costPerResult: results > 0 ? amountSpent / results : 0,
  };
}

// Agrupa os lançamentos (potencialmente várias campanhas no mesmo dia) por data,
// somando os valores absolutos e recalculando CTR/CPC/CPM ponderados — para o
// gráfico de evolução diária.
export function groupCampaignRowsByDate(rows: CampaignRow[]) {
  const byDate = new Map<string, CampaignRow[]>();
  for (const r of rows) {
    const arr = byDate.get(r.date) ?? [];
    arr.push(r);
    byDate.set(r.date, arr);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, dayRows]) => {
      const totals = sumCampaignTotals(dayRows);
      return { date, ...totals };
    });
}

export async function getCampaignDashboardData(clientId: string, range: PeriodRange, prevRange: PeriodRange, leadsWon: number, prevLeadsWon: number) {
  const [rows, prevRows] = await Promise.all([
    getCampaignMetricsInRange(clientId, range),
    getCampaignMetricsInRange(clientId, prevRange),
  ]);

  const totals = sumCampaignTotals(rows);
  const prevTotals = sumCampaignTotals(prevRows);

  const cpa = leadsWon > 0 ? totals.amountSpent / leadsWon : null;
  const prevCpa = prevLeadsWon > 0 ? prevTotals.amountSpent / prevLeadsWon : null;

  return {
    rows,
    dailySeries: groupCampaignRowsByDate(rows),
    totals,
    prevTotals,
    cpa,
    prevCpa,
  };
}
