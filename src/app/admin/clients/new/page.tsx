import { ClientForm } from "@/components/admin/client-form";
import { createClient } from "@/actions/clients";
import { PageHeader } from "@/components/layout/page-header";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Agência" title="Novo cliente" description="Cadastre uma nova conta atendida pela agência" />
      <ClientForm action={createClient} submitLabel="Criar cliente" />
    </div>
  );
}
