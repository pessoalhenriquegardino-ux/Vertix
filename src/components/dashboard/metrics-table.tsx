import { ClipboardList } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";

type Row = {
  id: string;
  date: string;
  adSpend: number;
  leadsGenerated: number;
  leadsInAnalysis: number;
  leadsQualified: number;
  leadsProposal: number;
  leadsWon: number;
  leadsLost: number;
  source: string;
};

const sourceLabel: Record<string, string> = {
  MANUAL: "Manual",
  CSV_IMPORT: "CSV",
  META_ADS_API: "Meta Ads",
  WHATSAPP_API: "WhatsApp",
};

export function MetricsTable({ rows }: { rows: Row[] }) {
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nenhum lançamento no período"
        description="Lance dados manualmente ou importe um CSV para ver o histórico aqui."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Gasto</TableHead>
          <TableHead>Nova Conversa</TableHead>
          <TableHead>Análise</TableHead>
          <TableHead>Qualificado</TableHead>
          <TableHead>Proposta</TableHead>
          <TableHead>Sucesso</TableHead>
          <TableHead>Perdas</TableHead>
          <TableHead>Origem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{formatDateBR(r.date)}</TableCell>
            <TableCell>{formatCurrencyBRL(r.adSpend)}</TableCell>
            <TableCell>{r.leadsGenerated}</TableCell>
            <TableCell>{r.leadsInAnalysis}</TableCell>
            <TableCell>{r.leadsQualified}</TableCell>
            <TableCell>{r.leadsProposal}</TableCell>
            <TableCell>{r.leadsWon}</TableCell>
            <TableCell>{r.leadsLost}</TableCell>
            <TableCell>
              <Badge variant="secondary">{sourceLabel[r.source] ?? r.source}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
