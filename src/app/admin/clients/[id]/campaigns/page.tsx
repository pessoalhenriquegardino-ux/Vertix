import { notFound } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { resolvePeriod, previousPeriod } from "@/lib/metrics";
import { getCampaignDashboardData } from "@/lib/campaign-metrics";
import { CampaignView } from "@/components/campaigns/campaign-view";
import { AdminClientHeader } from "@/components/admin/admin-client-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function AdminClientCampaignsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  const range = resolvePeriod(searchParams.from, searchParams.to);
  const prevRange = previousPeriod(range);

  const data = await getCampaignDashboardData(client.id, range, prevRange);

  return (
    <div className="space-y-6">
      <AdminClientHeader client={client} />
      <CampaignView
        basePath={`/admin/clients/${client.id}/campaigns`}
        range={range}
        data={data}
        extraHeader={
          <>
            <LinkButton href={`/admin/clients/${client.id}/campaigns/entry`} variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Lançar dados
            </LinkButton>
            <LinkButton href={`/admin/clients/${client.id}/campaigns/import`} variant="outline" size="sm">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar CSV
            </LinkButton>
          </>
        }
      />
    </div>
  );
}
