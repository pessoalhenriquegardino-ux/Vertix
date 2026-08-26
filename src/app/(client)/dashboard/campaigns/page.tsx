import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientById } from "@/lib/clients";
import { resolvePeriod, previousPeriod } from "@/lib/metrics";
import { getCampaignDashboardData } from "@/lib/campaign-metrics";
import { CampaignView } from "@/components/campaigns/campaign-view";

export default async function ClientCampaignsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT" || !session.user.clientId) redirect("/admin/clients");

  const client = await getClientById(session.user.clientId);
  if (!client) redirect("/login");

  const range = resolvePeriod(searchParams.from, searchParams.to);
  const prevRange = previousPeriod(range);

  const data = await getCampaignDashboardData(client.id, range, prevRange);

  return <CampaignView basePath="/dashboard/campaigns" range={range} data={data} />;
}
