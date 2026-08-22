import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { CampaignEntryForm } from "@/components/admin/campaign-entry-form";
import { upsertManualCampaignMetric } from "@/actions/campaign-metrics";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function CampaignEntryPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  const boundAction = upsertManualCampaignMetric.bind(null, client.id);

  return (
    <div className="space-y-6">
      <LinkButton href={`/admin/clients/${client.id}/campaigns`} variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar às campanhas
      </LinkButton>
      <PageHeader eyebrow="Campanhas" title={`Lançamento de campanha — ${client.name}`} description="Registre os números de mídia paga do dia." />
      <CampaignEntryForm action={boundAction} />
    </div>
  );
}
