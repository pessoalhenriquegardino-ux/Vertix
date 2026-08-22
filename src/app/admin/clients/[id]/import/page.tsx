import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function ImportPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <LinkButton href={`/admin/clients/${client.id}/dashboard`} variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao pipeline
      </LinkButton>
      <PageHeader eyebrow="Pipeline" title={`Importar CSV — ${client.name}`} description="Envie um arquivo CSV com vários dias de uma vez." />
      <CsvImportForm clientId={client.id} />
    </div>
  );
}
