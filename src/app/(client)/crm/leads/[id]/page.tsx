import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getLeadDetail } from "@/lib/leads";
import { getClientById } from "@/lib/clients";
import { registerCadenceOutcome, rescheduleCadence } from "@/actions/lead-activities";
import { LeadDetail } from "@/components/crm/lead-detail";
import { LinkButton } from "@/components/ui/link-button";

export default async function ClientLeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT" || !session.user.clientId) redirect("/admin/clients");

  const leadRecord = await getLeadDetail(params.id);
  if (!leadRecord || leadRecord.clientId !== session.user.clientId) notFound();

  const client = await getClientById(session.user.clientId);
  const lead = { ...leadRecord, value: leadRecord.value ? Number(leadRecord.value) : null };
  const basePath = `/crm/leads/${lead.id}`;
  const boundRegister = registerCadenceOutcome.bind(null, lead.id, basePath);
  const boundReschedule = rescheduleCadence.bind(null, basePath);

  return (
    <div className="space-y-6">
      <LinkButton href="/crm" variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao CRM
      </LinkButton>
      <LeadDetail
        lead={lead}
        basePath={basePath}
        listPath="/crm"
        registerAction={boundRegister}
        rescheduleAction={boundReschedule}
        whatsappTemplate={client?.whatsappTemplate}
      />
    </div>
  );
}
