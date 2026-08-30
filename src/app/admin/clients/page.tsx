import { Plus, Building2, Users, Activity, LayoutDashboard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PushNotificationToggle } from "@/components/push-notification-toggle";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function AdminClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, metrics: true } } },
  });

  const activeCount = clients.filter((c) => c.active).length;
  const totalUsers = clients.reduce((a, c) => a + c._count.users, 0);
  const totalEntries = clients.reduce((a, c) => a + c._count.metrics, 0);

  const summary = [
    { label: "Clientes", value: clients.length, icon: Building2, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Ativos", value: activeCount, icon: Activity, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Usuários com acesso", value: totalUsers, icon: Users, tint: "bg-blue-50 text-blue-600" },
    { label: "Lançamentos registrados", value: totalEntries, icon: LayoutDashboard, tint: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agência"
        title="Clientes"
        description="Gerencie os clientes atendidos pela Vertix"
        actions={
          <>
            <PushNotificationToggle />
            <LinkButton href="/admin/clients/new">
              <Plus className="mr-1.5 h-4 w-4" /> Novo cliente
            </LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="space-y-2.5 p-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tint}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                  <p className="tabular-nums text-xl font-semibold tracking-tight text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhum cliente cadastrado ainda"
              description="Clique em “Novo cliente” para começar a acompanhar sua primeira conta."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Lançamentos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {initials(c.name)}
                        </div>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{c.segment ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "success" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{c._count.users}</TableCell>
                    <TableCell className="tabular-nums">{c._count.metrics}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <LinkButton href={`/admin/clients/${c.id}/dashboard`} variant="outline" size="sm">
                        Ver dashboard
                      </LinkButton>
                      <LinkButton href={`/admin/clients/${c.id}`} variant="ghost" size="sm">
                        Editar
                      </LinkButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
