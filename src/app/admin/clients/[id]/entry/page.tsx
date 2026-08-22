import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientById } from "@/lib/clients";
import { EntryForm } from "@/components/admin/entry-form";
import { upsertManualMetric } from "@/actions/metrics";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";

export default async function EntryPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  const boundAction = upsertManualMetric.bind(null, client.id);

  return (
    <div className="space-y-6">
      <LinkButton href={`/admin/clients/${client.id}/dashboard`} variant="ghost" size="sm">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao pipeline
      </LinkButton>
      <PageHeader eyebrow="Pipeline" title={`Lançamento manual — ${client.name}`} description="Registre os números do dia para este cliente." />
      <EntryForm action={boundAction} />
    </div>
  );
}
