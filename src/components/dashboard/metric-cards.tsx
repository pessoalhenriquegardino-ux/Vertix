import { Wallet, MessageCircleMore, Search, BadgeCheck, FileText, Trophy, XCircle, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyBRL, percentChange, cn } from "@/lib/utils";
import type { MetricTotals } from "@/lib/metrics";

function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change === null) return <span className="text-[11px] text-muted-foreground">sem base anterior</span>;

  const positive = change >= 0;
  return (
    <span className={cn("text-[11px] font-medium", positive ? "text-emerald-600" : "text-red-600")}>
      {positive ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

const CARD_META: { key: keyof MetricTotals; label: string; icon: LucideIcon; tint: string }[] = [
  { key: "adSpend", label: "Gasto total", icon: Wallet, tint: "bg-indigo-50 text-indigo-600" },
  { key: "leadsGenerated", label: "Nova Conversa", icon: MessageCircleMore, tint: "bg-blue-50 text-blue-600" },
  { key: "leadsInAnalysis", label: "Análise", icon: Search, tint: "bg-sky-50 text-sky-600" },
  { key: "leadsQualified", label: "Qualificado", icon: BadgeCheck, tint: "bg-cyan-50 text-cyan-600" },
  { key: "leadsProposal", label: "Proposta", icon: FileText, tint: "bg-amber-50 text-amber-600" },
  { key: "leadsWon", label: "Sucesso", icon: Trophy, tint: "bg-emerald-50 text-emerald-600" },
  { key: "leadsLost", label: "Perdas", icon: XCircle, tint: "bg-red-50 text-red-600" },
];

export function MetricCards({ totals, prevTotals }: { totals: MetricTotals; prevTotals: MetricTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {CARD_META.map((c) => {
        const Icon = c.icon;
        const value = c.key === "adSpend" ? formatCurrencyBRL(totals[c.key]) : totals[c.key].toLocaleString("pt-BR");
        return (
          <Card key={c.key} className="transition-shadow hover:shadow-md">
            <CardContent className="space-y-2.5 p-4">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.tint)}>
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">{c.label}</p>
                <p className="tabular-nums text-xl font-semibold tracking-tight text-foreground">{value}</p>
              </div>
              <ChangeBadge current={totals[c.key]} previous={prevTotals[c.key]} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
