import { notFound } from "next/navigation";
import { Plus, Upload, KanbanSquare, LayoutDashboard, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/admin/client-form";
import { UserForm } from "@/components/admin/user-form";
import { updateClient } from "@/actions/clients";
import { createClientUser } from "@/actions/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteClientButton } from "@/components/admin/delete-client-button";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, createdAt: true },
      },
    },
  });

  if (!client) notFound();

  const boundUpdate = updateClient.bind(null, client.id);
  const boundCreateUser = createClientUser.bind(null, client.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agência"
        title={client.name}
        description="Gerencie os dados, acessos e a operação deste cliente"
        actions={
          <>
            <LinkButton href={`/admin/clients/${client.id}/entry`} variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Lançar dados
            </LinkButton>
            <LinkButton href={`/admin/clients/${client.id}/import`} variant="outline" size="sm">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar CSV
            </LinkButton>
            <LinkButton href={`/admin/clients/${client.id}/crm`} variant="outline" size="sm">
              <KanbanSquare className="mr-1.5 h-3.5 w-3.5" /> CRM
            </LinkButton>
            <LinkButton href={`/admin/clients/${client.id}/dashboard`} size="sm">
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" /> Ver dashboard
            </LinkButton>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            action={boundUpdate}
            defaultValues={{ name: client.name, segment: client.segment, active: client.active }}
            submitLabel="Salvar alterações"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Usuários com acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.users.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum login criado ainda" description="Crie o primeiro acesso abaixo." />
          ) : (
            <ul className="space-y-2">
              {client.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge variant="secondary">CLIENT</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Criar novo login para o cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm action={boundCreateUser} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona de risco</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </CardContent>
      </Card>
    </div>
  );
}
