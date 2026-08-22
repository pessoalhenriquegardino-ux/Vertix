"use client";

import { GenericCsvImportForm } from "@/components/admin/generic-csv-import-form";
import { importLeadsCsv } from "@/actions/leads-csv-import";

const REQUIRED_COLUMNS = ["name", "phone", "email", "source", "stage", "value"];

export function LeadsCsvImportForm({ clientId, basePath }: { clientId: string; basePath: string }) {
  return (
    <GenericCsvImportForm
      requiredColumns={REQUIRED_COLUMNS}
      helpText={`Cabeçalho esperado: ${REQUIRED_COLUMNS.join(
        ", "
      )}. "stage" aceita: NEW, IN_ANALYSIS, QUALIFIED, PROPOSAL, WON, LOST (opcional, padrão NEW).`}
      importFn={(rows) => importLeadsCsv(clientId, basePath, rows)}
    />
  );
}
