import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LeadsCsvImportForm } from "@/components/crm/leads-csv-import-form";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function ClientCrmImportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT" || !session.user.clientId) redirect("/admin/clients");

  return (
    <div className="space-y-6">
      <LinkButton href="/crm" variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao CRM
      </LinkButton>
      <PageHeader eyebrow="CRM" title="Importar leads (CSV)" description="Envie vários leads de uma vez." />
      <LeadsCsvImportForm clientId={session.user.clientId} basePath="/crm" />
    </div>
  );
}
