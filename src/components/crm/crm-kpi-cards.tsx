import { Users, TrendingUp, Wallet, HandCoins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyBRL } from "@/lib/utils";
import type { LeadsKpis } from "@/lib/leads";

export function CrmKpiCards({ kpis }: { kpis: LeadsKpis }) {
  const cards = [
    { label: "Leads no funil", value: kpis.totalLeads.toLocaleString("pt-BR"), icon: Users, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Taxa de conversão", value: `${kpis.conversionRate.toFixed(1)}%`, icon: TrendingUp, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Valor do pipeline", value: formatCurrencyBRL(kpis.pipelineValue), icon: Wallet, tint: "bg-amber-50 text-amber-600" },
    { label: "Receita fechada", value: formatCurrencyBRL(kpis.closedRevenue), icon: HandCoins, tint: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.tint}`}>
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-muted-foreground">{c.label}</p>
                <p className="tabular-nums text-lg font-semibold tracking-tight text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
