"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateBR } from "@/lib/utils";

type Row = {
  date: string;
  amountSpent: number;
  clicks: number;
  ctr: number;
};

export function CampaignEvolutionChart({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Nenhum dado de campanha no período"
        description="Lance manualmente ou importe um CSV do Meta Ads para ver a evolução."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={(v) => formatDateBR(v)} tick={{ fontSize: 12 }} minTickGap={24} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} unit="%" />
        <Tooltip labelFormatter={(v) => formatDateBR(v as string)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="amountSpent" name="Gasto (R$)" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="clicks" name="Cliques" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="ctr" name="CTR (%)" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
