"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { ImportResult } from "@/actions/csv-import";

export function GenericCsvImportForm({
  requiredColumns,
  helpText,
  importFn,
}: {
  requiredColumns: string[];
  helpText: string;
  importFn: (rows: unknown[]) => Promise<ImportResult>;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setParseError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const columns = res.meta.fields ?? [];
        const missing = requiredColumns.filter((c) => !columns.includes(c));
        if (missing.length > 0) {
          setParseError(`Colunas faltando no CSV: ${missing.join(", ")}`);
          setRows([]);
          return;
        }
        setRows(res.data);
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await importFn(rows);
      setResult(res);
      if (res.success) setRows([]);
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
        <p className="text-xs text-muted-foreground">{helpText}</p>
      </div>

      {parseError && <p className="text-sm text-destructive">{parseError}</p>}

      {rows.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm">
            <strong>{rows.length}</strong> linha(s) prontas para importar. Confira o preview abaixo:
          </p>
          <div className="max-h-80 overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {requiredColumns.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    {requiredColumns.map((c) => (
                      <TableCell key={c}>{r[c]}</TableCell>
                    ))}
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
