"use client";

import { useState } from "react";
import Papa from "papaparse";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { importCampaignCsv } from "@/actions/campaign-csv-import";
import type { ImportResult } from "@/actions/csv-import";
import {
  detectMetaColumns,
  mapAndAggregateMetaRows,
  META_FIELD_LABELS,
  type NormalizedCampaignRow,
  type MetaField,
} from "@/lib/meta-csv";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";

const PREVIEW_COLUMNS: MetaField[] = [
  "date",
  "campaignName",
  "amountSpent",
  "impressions",
  "clicks",
  "results",
  "reach",
  "frequency",
];

export function CampaignCsvImportForm({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<NormalizedCampaignRow[]>([]);
  const [detected, setDetected] = useState<Partial<Record<MetaField, string>> | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setParseError(null);
    setRows([]);
    setDetected(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rawHeaders = res.meta.fields ?? [];
        const { headerMap, missing } = detectMetaColumns(rawHeaders);

        if (missing.length > 0) {
          setParseError(
            `Não consegui identificar estas colunas no arquivo: ${missing
              .map((f) => META_FIELD_LABELS[f])
              .join(", ")}. Colunas encontradas no CSV: ${rawHeaders.join(", ")}`
          );
          return;
        }

        const { rows: mapped, skipped: skippedCount } = mapAndAggregateMetaRows(res.data, headerMap);
        setDetected(headerMap);
        setSkipped(skippedCount);
        setRows(mapped);
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const payload = rows.map((r) => ({
        date: r.date,
        campaign_name: r.campaign_name,
        amount_spent: r.amount_spent,
        impressions: r.impressions,
        clicks: r.clicks,
        results: r.results,
        reach: r.reach,
        frequency: r.frequency,
      }));
      const res = await importCampaignCsv(clientId, payload);
      setResult(res);
      if (res.success) {
        setRows([]);
        setDetected(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/70"
        />
        <p className="text-xs text-muted-foreground">
          Exporte direto do Meta Ads Manager (qualquer relatório de campanhas) e suba o CSV aqui — o sistema
          reconhece as colunas automaticamente, não precisa ajustar nada no arquivo.
        </p>
      </div>

      {parseError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {detected && rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Colunas identificadas automaticamente:</span>
            {Object.entries(detected).map(([field, original]) => (
              <Badge key={field} variant="secondary" className="bg-white">
                {META_FIELD_LABELS[field as MetaField]} ← &quot;{original}&quot;
              </Badge>
            ))}
          </div>

          <p className="text-sm">
            <strong>{rows.length}</strong> linha(s) prontas para importar (campanhas repetidas no mesmo dia foram
            somadas automaticamente).
            {skipped > 0 && ` ${skipped} linha(s) ignoradas por não terem data ou nome de campanha.`}
          </p>

          <div className="max-h-80 overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {PREVIEW_COLUMNS.map((c) => (
                    <TableHead key={c}>{META_FIELD_LABELS[c]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDateBR(r.date)}</TableCell>
                    <TableCell className="font-medium">{r.campaign_name}</TableCell>
                    <TableCell>{formatCurrencyBRL(r.amount_spent)}</TableCell>
                    <TableCell>{r.impressions.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{r.clicks.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{r.results}</TableCell>
                    <TableCell>{r.reach.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{r.frequency.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length > 50 && (
            <p className="text-xs text-muted-foreground">Mostrando as primeiras 50 de {rows.length} linhas.</p>
          )}
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Importando..." : `Confirmar importação de ${rows.length} linha(s)`}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-md border border-border p-4">
          {result.success ? (
            <p className="text-sm text-emerald-700">Importação concluída: {result.imported} linha(s) gravadas.</p>
          ) : (
            <p className="text-sm text-destructive">Importação falhou.</p>
          )}
          {result.errors.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
