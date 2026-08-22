import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangeForm } from "@/components/dashboard/date-range-form";
import { CampaignCards } from "@/components/campaigns/campaign-cards";
import { CampaignEvolutionChart } from "@/components/campaigns/campaign-evolution-chart";
import { CampaignTable } from "@/components/campaigns/campaign-table";
import { PageHeader } from "@/components/layout/page-header";
import { toDateInputValue } from "@/lib/utils";
import type { PeriodRange } from "@/lib/metrics";
import type { getCampaignDashboardData } from "@/lib/campaign-metrics";

export function CampaignView({
  basePath,
  range,
  data,
  extraHeader,
}: {
  basePath: string;
  range: PeriodRange;
  data: Awaited<ReturnType<typeof getCampaignDashboardData>>;
  extraHeader?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campanhas"
        title="Performance de mídia paga"
        description="Métricas de anúncios (impressões, cliques, CTR, CPA) no período"
        actions={
          <>
            {extraHeader}
            <DateRangeForm basePath={basePath} from={toDateInputValue(range.from)} to={toDateInputValue(range.to)} />
          </>
        }
      />

      <CampaignCards totals={data.totals} prevTotals={data.prevTotals} cpa={data.cpa} prevCpa={data.prevCpa} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Evolução no período</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignEvolutionChart rows={data.dailySeries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Lançamentos por campanha</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignTable rows={data.rows} />
        </CardContent>
      </Card>
    </div>
  );
}
