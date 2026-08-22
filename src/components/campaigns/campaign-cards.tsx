import { Wallet, Eye, MousePointerClick, Percent, DollarSign, Layers, Target, Receipt, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyBRL, percentChange, cn } from "@/lib/utils";
import type { CampaignTotals } from "@/lib/campaign-metrics";

function ChangeLabel({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const change = percentChange(current, previous);
  if (change === null) return <span className="text-[11px] text-muted-foreground">sem base anterior</span>;

  const positive = invert ? change <= 0 : change >= 0;
  return (
    <span className={cn("text-[11px] font-medium", positive ? "text-emerald-600" : "text-red-600")}>
      {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export function CampaignCards({
  totals,
  prevTotals,
  cpa,
  prevCpa,
}: {
  totals: CampaignTotals;
  prevTotals: CampaignTotals;
  cpa: number | null;
  prevCpa: number | null;
}) {
  const cards: { label: string; value: string; current: number; previous: number; invert?: boolean; icon: LucideIcon; tint: string }[] = [
    { label: "Gasto total", value: formatCurrencyBRL(totals.amountSpent), current: totals.amountSpent, previous: prevTotals.amountSpent, invert: true, icon: Wallet, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Impressões", value: totals.impressions.toLocaleString("pt-BR"), current: totals.impressions, previous: prevTotals.impressions, icon: Eye, tint: "bg-blue-50 text-blue-600" },
    { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR"), current: totals.clicks, previous: prevTotals.clicks, icon: MousePointerClick, tint: "bg-sky-50 text-sky-600" },
    { label: "CTR médio", value: `${totals.ctr.toFixed(2)}%`, current: totals.ctr, previous: prevTotals.ctr, icon: Percent, tint: "bg-cyan-50 text-cyan-600" },
    { label: "CPC médio", value: formatCurrencyBRL(totals.cpc), current: totals.cpc, previous: prevTotals.cpc, invert: true, icon: DollarSign, tint: "bg-teal-50 text-teal-600" },
    { label: "CPM médio", value: formatCurrencyBRL(totals.cpm), current: totals.cpm, previous: prevTotals.cpm, invert: true, icon: Layers, tint: "bg-violet-50 text-violet-600" },
    { label: "Resultados", value: totals.results.toLocaleString("pt-BR"), current: totals.results, previous: prevTotals.results, icon: Target, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Custo por resultado", value: formatCurrencyBRL(totals.costPerResult), current: totals.costPerResult, previous: prevTotals.costPerResult, invert: true, icon: Receipt, tint: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-2.5 p-4">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.tint)}>
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">{c.label}</p>
                  <p className="tabular-nums text-xl font-semibold tracking-tight text-foreground">{c.value}</p>
                </div>
                <ChangeLabel current={c.current} previous={c.previous} invert={c.invert} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-primary/25 bg-gradient-to-br from-accent to-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-primary/80">CPA médio por contrato fechado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="tabular-nums text-2xl font-semibold tracking-tight text-foreground">
            {cpa === null ? "—" : formatCurrencyBRL(cpa)}
          </p>
          {cpa === null ? (
            <span className="text-xs text-muted-foreground">
              Nenhum &quot;Sucesso&quot; registrado no pipeline neste período.
            </span>
          ) : (
            <ChangeLabel current={cpa} previous={prevCpa ?? 0} invert />
          )}
          <p className="text-xs text-muted-foreground">
            Gasto total em campanhas ÷ leads marcados como &quot;Sucesso&quot; no pipeline do período.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
