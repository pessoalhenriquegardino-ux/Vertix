import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeForm } from "@/components/dashboard/date-range-form";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import { MetricsTable } from "@/components/dashboard/metrics-table";
import { PageHeader } from "@/components/layout/page-header";
import { toDateInputValue } from "@/lib/utils";
import type { getDashboardData } from "@/lib/metrics";

export function DashboardView({
  clientName,
  basePath,
  data,
  extraHeader,
}: {
  clientName: string;
  basePath: string;
  data: Awaited<ReturnType<typeof getDashboardData>>;
  extraHeader?: React.ReactNode;
}) {
  const { range, rows, totals, prevTotals } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title={clientName}
        description="Funil de leads (CRM) e investimento em campanhas — dados em tempo real"
        actions={
          <>
            {extraHeader}
            <DateRangeForm basePath={basePath} from={toDateInputValue(range.from)} to={toDateInputValue(range.to)} />
          </>
        }
      />

      <MetricCards totals={totals} prevTotals={prevTotals} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Evolução no período</CardTitle>
        </CardHeader>
        <CardContent>
          <EvolutionChart rows={rows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Lançamentos do período</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricsTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
