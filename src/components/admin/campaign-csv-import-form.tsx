"use client";

import { GenericCsvImportForm } from "@/components/admin/generic-csv-import-form";
import { importCampaignCsv } from "@/actions/campaign-csv-import";

const REQUIRED_COLUMNS = [
  "date",
  "campaign_name",
  "amount_spent",
  "impressions",
  "clicks",
  "results",
  "reach",
  "frequency",
];

export function CampaignCsvImportForm({ clientId }: { clientId: string }) {
  return (
    <GenericCsvImportForm
      requiredColumns={REQUIRED_COLUMNS}
      helpText={`Cabeçalho esperado: ${REQUIRED_COLUMNS.join(", ")}. Exporte do Meta Ads Manager e renomeie as colunas (ou use exemplo-importacao-campanhas.csv como modelo). CTR, CPC, CPM e custo/resultado são calculados automaticamente.`}
      importFn={(rows) => importCampaignCsv(clientId, rows)}
    />
  );
}
