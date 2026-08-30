import { notFound } from "next/navigation";
import { Upload } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { getLeadsForClient, computeLeadsKpis } from "@/lib/leads";
import { createLead } from "@/actions/leads";
import { getMetaConnection } from "@/actions/meta";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { NewLeadForm } from "@/components/crm/new-lead-form";
import { CrmKpiCards } from "@/components/crm/crm-kpi-cards";
import { MetaConnectionCard } from "@/components/crm/meta-connection-card";
import { InboundWebhookCard } from "@/components/crm/inbound-webhook-card";
import { WhatsappTemplateCard } from "@/components/crm/whatsapp-template-card";
import { updateWhatsappTemplate } from "@/actions/whatsapp-template";
import { AdminClientHeader } from "@/components/admin/admin-client-header";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function AdminClientCrmPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  const [leads, metaConnection] = await Promise.all([
    getLeadsForClient(client.id),
    getMetaConnection(client.id),
  ]);
  const kpis = computeLeadsKpis(leads);
  const boundCreateLead = createLead.bind(null, client.id, `/admin/clients/${client.id}/crm`);
  const boundUpdateWhatsappTemplate = updateWhatsappTemplate.bind(null, client.id, `/admin/clients/${client.id}/crm`);

  return (
    <div className="space-y-6">
      <AdminClientHeader client={client} />
      <MetaConnectionCard
        clientId={client.id}
        connectPath={`/api/meta/connect?clientId=${client.id}`}
        connection={metaConnection}
      />
      <InboundWebhookCard clientId={client.id} webhookToken={client.webhookToken} />
      <WhatsappTemplateCard currentTemplate={client.whatsappTemplate} action={boundUpdateWhatsappTemplate} />
      <PageHeader
        eyebrow="CRM"
        title="Funil de leads"
        description="Arraste os cards (no computador) ou abra o lead pra mudar de etapa"
        actions={
          <>
            <LinkButton href={`/admin/clients/${client.id}/crm/import`} variant="outline" size="sm">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar CSV
            </LinkButton>
            <NewLeadForm action={boundCreateLead} />
          </>
        }
      />
      <CrmKpiCards kpis={kpis} />
      <KanbanBoard leads={leads} leadBasePath={`/admin/clients/${client.id}/crm/leads`} />
    </div>
  );
}
