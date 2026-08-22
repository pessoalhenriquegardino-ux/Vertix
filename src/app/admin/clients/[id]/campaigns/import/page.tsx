import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { CampaignCsvImportForm } from "@/components/admin/campaign-csv-import-form";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function CampaignImportPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <LinkButton href={`/admin/clients/${client.id}/campaigns`} variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar às campanhas
      </LinkButton>
      <PageHeader
        eyebrow="Campanhas"
        title={`Importar CSV de campanhas — ${client.name}`}
        description="Exporte do Meta Ads Manager e ajuste as colunas para o formato esperado."
      />
      <CampaignCsvImportForm clientId={client.id} />
    </div>
  );
}
