import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { getLeadDetail } from "@/lib/leads";
import { registerCadenceOutcome, rescheduleCadence } from "@/actions/lead-activities";
import { LeadDetail } from "@/components/crm/lead-detail";
import { LinkButton } from "@/components/ui/link-button";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: { id: string; leadId: string };
}) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  const leadRecord = await getLeadDetail(params.leadId);
  if (!leadRecord || leadRecord.clientId !== client.id) notFound();

  const lead = { ...leadRecord, value: leadRecord.value ? Number(leadRecord.value) : null };
  const listPath = `/admin/clients/${client.id}/crm`;
  const basePath = `${listPath}/leads/${lead.id}`;
  const boundRegister = registerCadenceOutcome.bind(null, lead.id, basePath);
  const boundReschedule = rescheduleCadence.bind(null, basePath);

  return (
    <div className="space-y-6">
      <LinkButton href={listPath} variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao CRM
      </LinkButton>
      <LeadDetail
        lead={lead}
        basePath={basePath}
        listPath={listPath}
        registerAction={boundRegister}
        rescheduleAction={boundReschedule}
        whatsappTemplate={client.whatsappTemplate}
      />
    </div>
  );
}
