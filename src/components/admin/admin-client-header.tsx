import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { SectionTabs } from "@/components/layout/section-tabs";
import { adminClientTabs } from "@/lib/nav-tabs";

export function AdminClientHeader({
  client,
}: {
  client: { id: string; name: string; segment: string | null; active: boolean };
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link href="/admin/clients" className="hover:text-foreground">
            Clientes
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{client.name}</span>
          <Badge variant={client.active ? "success" : "secondary"} className="ml-1">
            {client.active ? "Ativo" : "Inativo"}
          </Badge>
          {client.segment && <Badge variant="outline">{client.segment}</Badge>}
        </div>
        <LinkButton href={`/admin/clients/${client.id}`} variant="outline" size="sm">
          <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Gerenciar cliente
        </LinkButton>
      </div>

      <SectionTabs tabs={adminClientTabs(client.id)} />
    </div>
  );
}
