import { notFound } from "next/navigation";
import { getClientById } from "@/lib/clients";
import { getDashboardData } from "@/lib/metrics";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { AdminClientHeader } from "@/components/admin/admin-client-header";

export default async function AdminClientDashboardPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}) {
  const client = await getClientById(params.id);
  if (!client) notFound();

  const data = await getDashboardData(client.id, searchParams.from, searchParams.to);

  return (
    <div className="space-y-6">
      <AdminClientHeader client={client} />
      <DashboardView clientName={client.name} basePath={`/admin/clients/${client.id}/dashboard`} data={data} />
    </div>
  );
}
