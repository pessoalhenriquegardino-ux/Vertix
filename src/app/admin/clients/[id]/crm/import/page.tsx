import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { LeadsCsvImportForm } from "@/components/crm/leads-csv-import-form";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function AdminCrmImportPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <LinkButton href={`/admin/clients/${client.id}/crm`} variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao CRM
      </LinkButton>
      <PageHeader eyebrow="CRM" title={`Importar leads — ${client.name}`} description="Envie vários leads de uma vez." />
      <LeadsCsvImportForm clientId={client.id} basePath={`/admin/clients/${client.id}/crm`} />
    </div>
  );
}
