"use client";

import { useState } from "react";
import Papa from "papaparse";
import { CheckCircle2, AlertTriangle, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { importLeadsCsv, importMetaLeadsCsv } from "@/actions/leads-csv-import";
import type { ImportResult } from "@/actions/csv-import";
import { detectMetaLeadsFormat, mapMetaLeadsRows, type NormalizedMetaLead } from "@/lib/meta-leads-csv";
import { formatDateBR } from "@/lib/utils";

const SIMPLE_COLUMNS = ["name", "phone", "email", "source", "stage", "value"];

type Mode = "meta" | "simple";

export function LeadsCsvImportForm({ clientId, basePath }: { clientId: string; basePath: string }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [metaRows, setMetaRows] = useState<NormalizedMetaLead[]>([]);
  const [simpleRows, setSimpleRows] = useState<Record<string, string>[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setResult(null);
    setParseError(null);
    setMetaRows([]);
    setSimpleRows([]);
    setMode(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rawHeaders = res.meta.fields ?? [];

        // 1) tenta reconhecer como export de formulário do Meta Lead Ads
        const detection = detectMetaLeadsFormat(rawHeaders);
        if (detection.isMetaLeadsFormat) {
          const mapped = mapMetaLeadsRows(res.data, detection);
          if (mapped.length === 0) {
            setParseError("Reconheci o formato do Meta Lead Ads, mas nenhuma linha tinha nome preenchido.");
            return;
          }
          setMode("meta");
          setMetaRows(mapped);
          setQuestionCount(detection.questionCols.length);
          return;
        }

        // 2) tenta o formato simples (name,phone,email,source,stage,value)
        const missing = SIMPLE_COLUMNS.filter((c) => !rawHeaders.includes(c));
        if (missing.length === 0) {
          setMode("simple");
          setSimpleRows(res.data);
          return;
        }

        setParseError(
          `Não reconheci o formato deste CSV. Ele precisa ser um export de formulário do Meta Lead Ads (colunas como created_time, form_name, nome_completo...) ou ter o cabeçalho simples: ${SIMPLE_COLUMNS.join(
            ", "
          )}. Colunas encontradas: ${rawHeaders.join(", ")}`
        );
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res =
        mode === "meta"
          ? await importMetaLeadsCsv(clientId, basePath, metaRows)
          : await importLeadsCsv(clientId, basePath, simpleRows);
      setResult(res);
      if (res.success) {
        setMetaRows([]);
        setSimpleRows([]);
        setMode(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const rowCount = mode === "meta" ? metaRows.length : simpleRows.length;

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
          Aceita dois formatos: um export de formulário do Meta Lead Ads (baixado direto do Gerenciador de Anúncios
          ou do Meta Business Suite) — reconhecido automaticamente — ou uma planilha simples com as colunas{" "}
          {SIMPLE_COLUMNS.join(", ")}.
        </p>
      </div>

      {parseError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {mode === "meta" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Formulário do Meta Lead Ads reconhecido.</span>
            <Badge variant="secondary" className="bg-white">
              {questionCount} pergunta(s) do formulário viram anotações
            </Badge>
            <Badge variant="secondary" className="bg-white flex items-center gap-1">
              <MessageSquarePlus className="h-3 w-3" /> Entram em &quot;Nova Conversa&quot;
            </Badge>
          </div>

          <p className="text-sm">
            <strong>{rowCount}</strong> lead(s) prontos para importar. Leads já importados antes (mesmo id do Meta)
            serão atualizados, não duplicados.
          </p>

          <div className="max-h-96 overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Detalhes do formulário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metaRows.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{r.createdAt ? formatDateBR(r.createdAt) : "—"}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.email ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.phone ?? "—"}</TableCell>
                    <TableCell>{r.source}</TableCell>
                    <TableCell className="max-w-xs whitespace-pre-line text-xs text-muted-foreground">
                      {r.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rowCount > 50 && <p className="text-xs text-muted-foreground">Mostrando os primeiros 50 de {rowCount}.</p>}
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Importando..." : `Confirmar importação de ${rowCount} lead(s)`}
          </Button>
        </div>
      )}

      {mode === "simple" && (
        <div className="space-y-4">
          <p className="text-sm">
            <strong>{rowCount}</strong> linha(s) prontas para importar (formato simples).
          </p>
          <div className="max-h-80 overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {SIMPLE_COLUMNS.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {simpleRows.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    {SIMPLE_COLUMNS.map((c) => (
                      <TableCell key={c}>{r[c]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Importando..." : `Confirmar importação de ${rowCount} linha(s)`}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-md border border-border p-4">
          {result.success ? (
            <p className="text-sm text-emerald-700">Importação concluída: {result.imported} lead(s) gravados.</p>
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
