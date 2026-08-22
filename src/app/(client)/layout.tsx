import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LayoutDashboard, Megaphone, KanbanSquare } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getClientById } from "@/lib/clients";
import { AppShell } from "@/components/layout/app-shell";
import type { SidebarItem } from "@/components/layout/sidebar";

const CLIENT_ITEMS: SidebarItem[] = [
  { href: "/dashboard", label: "Pipeline", icon: <LayoutDashboard />, exact: true },
  { href: "/dashboard/campaigns", label: "Campanhas", icon: <Megaphone /> },
  { href: "/crm", label: "CRM", icon: <KanbanSquare /> },
];

export default async function ClientAreaLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT" || !session.user.clientId) redirect("/admin/clients");

  const client = await getClientById(session.user.clientId);
  if (!client) redirect("/login");

  return (
    <AppShell items={CLIENT_ITEMS} userName={session.user.name ?? ""} userSubtitle={client.name}>
      {children}
    </AppShell>
  );
}
