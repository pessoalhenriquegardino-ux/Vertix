import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import type { SidebarItem } from "@/components/layout/sidebar";

const ADMIN_ITEMS: SidebarItem[] = [
  { href: "/admin/clients", label: "Clientes", icon: <Building2 /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell items={ADMIN_ITEMS} userName={session.user.name ?? ""} userSubtitle="Administrador">
      {children}
    </AppShell>
  );
}
