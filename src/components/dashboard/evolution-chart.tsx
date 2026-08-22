"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateBR } from "@/lib/utils";

type Row = {
  date: string;
  leadsGenerated: number;
  leadsInAnalysis: number;
  leadsQualified: number;
  leadsProposal: number;
  leadsWon: number;
  leadsLost: number;
};

const SERIES: { key: keyof Row; label: string; color: string }[] = [
  { key: "leadsGenerated", label: "Nova Conversa", color: "#6366f1" },
  { key: "leadsInAnalysis", label: "Análise", color: "#3b82f6" },
  { key: "leadsQualified", label: "Qualificado", color: "#06b6d4" },
  { key: "leadsProposal", label: "Proposta", color: "#f59e0b" },
  { key: "leadsWon", label: "Sucesso", color: "#10b981" },
  { key: "leadsLost", label: "Perdas", color: "#ef4444" },
];

export function EvolutionChart({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={TrendingUp} title="Sem dados para exibir" description="Ajuste o período ou lance dados para ver a evolução." />;
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.5} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDateBR(v)}
          tick={{ fontSize: 12 }}
          minTickGap={24}
        />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(v) => formatDateBR(v as string)}
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SERIES.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="1"
            stroke={s.color}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
