"use client";

import { GenericCsvImportForm } from "@/components/admin/generic-csv-import-form";
import { importMetricsCsv } from "@/actions/csv-import";

const REQUIRED_COLUMNS = [
  "date",
  "ad_spend",
  "leads_generated",
  "leads_in_analysis",
  "leads_qualified",
  "leads_proposal",
  "leads_won",
  "leads_lost",
];

export function CsvImportForm({ clientId }: { clientId: string }) {
  return (
    <GenericCsvImportForm
      requiredColumns={REQUIRED_COLUMNS}
      helpText={`Cabeçalho esperado: ${REQUIRED_COLUMNS.join(", ")}`}
      importFn={(rows) => importMetricsCsv(clientId, rows)}
    />
  );
}
