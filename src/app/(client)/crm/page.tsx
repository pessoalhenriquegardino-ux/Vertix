import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientById } from "@/lib/clients";
import { getLeadsForClient, computeLeadsKpis } from "@/lib/leads";
import { createLead } from "@/actions/leads";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { NewLeadForm } from "@/components/crm/new-lead-form";
import { CrmKpiCards } from "@/components/crm/crm-kpi-cards";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function ClientCrmPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT" || !session.user.clientId) redirect("/admin/clients");

  const client = await getClientById(session.user.clientId);
  if (!client) redirect("/login");

  const leads = await getLeadsForClient(client.id);
  const kpis = computeLeadsKpis(leads);
  const boundCreateLead = createLead.bind(null, client.id, "/crm");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Funil de leads"
        description="Arraste os cards entre as etapas para acompanhar o funil"
        actions={
          <>
            <LinkButton href="/crm/import" variant="outline" size="sm">
              Importar CSV
            </LinkButton>
            <NewLeadForm action={boundCreateLead} />
          </>
        }
      />
      <CrmKpiCards kpis={kpis} />
      <KanbanBoard leads={leads} leadBasePath="/crm/leads" />
    </div>
  );
}
