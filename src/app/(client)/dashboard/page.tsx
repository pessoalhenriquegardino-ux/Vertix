import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardData } from "@/lib/metrics";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getClientById } from "@/lib/clients";

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT" || !session.user.clientId) redirect("/admin/clients");

  const client = await getClientById(session.user.clientId);
  if (!client) redirect("/login");

  const data = await getDashboardData(client.id, searchParams.from, searchParams.to);

  return <DashboardView clientName={client.name} basePath="/dashboard" data={data} />;
}
