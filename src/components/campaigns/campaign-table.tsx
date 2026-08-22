import { Receipt } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import type { CampaignRow } from "@/lib/campaign-metrics";

const sourceLabel: Record<string, string> = {
  MANUAL: "Manual",
  CSV_IMPORT: "CSV",
  META_ADS_API: "Meta Ads",
  WHATSAPP_API: "WhatsApp",
};

export function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhum lançamento de campanha no período"
        description="Lance manualmente ou importe um CSV para ver o histórico aqui."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Campanha</TableHead>
          <TableHead>Gasto</TableHead>
          <TableHead>Impressões</TableHead>
          <TableHead>Cliques</TableHead>
          <TableHead>CTR</TableHead>
          <TableHead>CPC</TableHead>
          <TableHead>CPM</TableHead>
          <TableHead>Resultados</TableHead>
          <TableHead>Custo/Resultado</TableHead>
          <TableHead>Origem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{formatDateBR(r.date)}</TableCell>
            <TableCell className="font-medium">{r.campaignName}</TableCell>
            <TableCell>{formatCurrencyBRL(r.amountSpent)}</TableCell>
            <TableCell>{r.impressions.toLocaleString("pt-BR")}</TableCell>
            <TableCell>{r.clicks.toLocaleString("pt-BR")}</TableCell>
            <TableCell>{r.ctr.toFixed(2)}%</TableCell>
            <TableCell>{formatCurrencyBRL(r.cpc)}</TableCell>
            <TableCell>{formatCurrencyBRL(r.cpm)}</TableCell>
            <TableCell>{r.results}</TableCell>
            <TableCell>{formatCurrencyBRL(r.costPerResult)}</TableCell>
            <TableCell>
              <Badge variant="secondary">{sourceLabel[r.source] ?? r.source}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
