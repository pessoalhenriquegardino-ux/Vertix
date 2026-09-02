"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Sheet, Unplug, RefreshCw, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { connectGoogleSheet, disconnectGoogleSheet, syncGoogleSheetNow, updateSyncInterval } from "@/actions/google-sheets";
import type { ActionState } from "@/actions/clients";

const INTERVAL_OPTIONS = [
  { minutes: 5, label: "A cada 5 minutos" },
  { minutes: 15, label: "A cada 15 minutos" },
  { minutes: 20, label: "A cada 20 minutos" },
  { minutes: 30, label: "A cada 30 minutos" },
  { minutes: 60, label: "A cada 1 hora" },
  { minutes: 180, label: "A cada 3 horas" },
  { minutes: 360, label: "A cada 6 horas" },
  { minutes: 1440, label: "1x por dia" },
];

function ConnectButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Conectando..." : "Conectar planilha"}
    </Button>
  );
}

type Connection = {
  sheetId: string;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  syncIntervalMinutes: number;
} | null;

export function GoogleSheetCard({
  clientId,
  basePath,
  connection,
  serviceAccountEmail,
}: {
  clientId: string;
  basePath: string;
  connection: Connection;
  serviceAccountEmail: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showHelp, setShowHelp] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const boundConnect = connectGoogleSheet.bind(null, clientId, basePath);
  const [state, formAction] = useFormState<ActionState, FormData>(boundConnect, undefined);

  function syncNow() {
    setSyncMsg(null);
    startTransition(async () => {
      const result = await syncGoogleSheetNow(clientId, basePath);
      setSyncMsg(result.error ? `Erro: ${result.error}` : `${result.imported} lead(s) novo(s) importado(s).`);
      router.refresh();
    });
  }

  function disconnect() {
    startTransition(async () => {
      await disconnectGoogleSheet(clientId, basePath);
      router.refresh();
    });
  }

  function changeInterval(minutes: number) {
    startTransition(async () => {
      await updateSyncInterval(clientId, basePath, minutes);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <Sheet className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              {connection ? (
                <>
                  <p className="text-sm font-medium text-foreground">Planilha Google conectada</p>
                  <p className="text-xs text-muted-foreground">
                    {connection.lastSyncAt
                      ? `Última sincronização: ${new Date(connection.lastSyncAt).toLocaleString("pt-BR")}`
                      : "Ainda não sincronizou."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Planilha Google não conectada</p>
                  <p className="text-xs text-muted-foreground">
                    Alternativa ao Meta direto — leads da integração nativa "Lead Ads → Planilha Google" entram
                    aqui sozinhos.
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowHelp((v) => !v)}
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Como conectar <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showHelp && (
          <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <strong>1.</strong> No Gerenciador de Anúncios do Meta, vá em Formulários de anúncios de lead →{" "}
              <strong>Configuração do CRM</strong> → conecte uma <strong>Integração com Planilha Google</strong>.
            </p>
            <p>
              <strong>2.</strong> Na planilha criada, clique em Compartilhar e adicione este email como{" "}
              <strong>Editor</strong>:{" "}
              <code className="rounded bg-background px-1 py-0.5">
                {serviceAccountEmail || "(peça o email pra agência)"}
              </code>
            </p>
            <p>
              <strong>3.</strong> Cole o link da planilha abaixo e clique em Conectar.
            </p>
          </div>
        )}

        {connection ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Verificar planilha
              </Label>
              <Select
                className="h-9 w-auto text-sm"
                defaultValue={String(connection.syncIntervalMinutes)}
                disabled={isPending}
                onChange={(e) => changeInterval(Number(e.target.value))}
              >
                {INTERVAL_OPTIONS.map((o) => (
                  <option key={o.minutes} value={o.minutes}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" size="sm" disabled={isPending} onClick={syncNow}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
            <Button variant="ghost" size="sm" disabled={isPending} onClick={disconnect}>
              <Unplug className="mr-1.5 h-3.5 w-3.5" /> Desconectar
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <Input
              name="sheetUrl"
              placeholder="Cole aqui o link da planilha do Google"
              className="min-w-0 flex-1"
              required
            />
            <ConnectButton />
          </form>
        )}

        {syncMsg && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {syncMsg}
          </p>
        )}
        {state?.error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {state.error}
          </p>
        )}
        {connection?.lastSyncError && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Última sincronização falhou: {connection.lastSyncError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
