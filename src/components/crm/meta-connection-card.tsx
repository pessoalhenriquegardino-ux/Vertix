"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, CheckCircle2, AlertTriangle, Unplug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { disconnectMeta } from "@/actions/meta";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "A integração com o Meta ainda não foi configurada pela agência (faltam as credenciais do App).",
  invalid_state: "A conexão expirou ou é inválida. Tente novamente.",
  forbidden: "Não autorizado a conectar esta conta.",
  no_pages: "Não encontramos nenhuma Página do Facebook nessa conta. Confirme se você é administrador de uma Página.",
  exchange_failed: "Não foi possível concluir a conexão com o Meta. Tente novamente.",
};

export function MetaConnectionCard({
  clientId,
  connectPath,
  connection,
}: {
  clientId: string;
  connectPath: string; // ex: "/api/meta/connect" (cliente) ou "/api/meta/connect?clientId=..." (admin)
  connection: { pageName: string; updatedAt: Date } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const connected = searchParams.get("meta_connected");
  const errorCode = searchParams.get("meta_error");

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Link2 className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div>
            {connection ? (
              <>
                <p className="text-sm font-medium text-foreground">Conectado ao Meta — {connection.pageName}</p>
                <p className="text-xs text-muted-foreground">
                  Novos leads de formulários instantâneos entram aqui automaticamente.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Meta Ads não conectado</p>
                <p className="text-xs text-muted-foreground">
                  Conecte a Página do Facebook/Instagram pra leads de formulários entrarem automaticamente no CRM.
                </p>
              </>
            )}
          </div>
        </div>

        {connection ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await disconnectMeta(clientId, window.location.pathname);
                router.refresh();
              })
            }
          >
            <Unplug className="mr-1.5 h-3.5 w-3.5" /> {isPending ? "Desconectando..." : "Desconectar"}
          </Button>
        ) : (
          <Button size="sm" onClick={() => (window.location.href = connectPath)}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Conectar com Meta
          </Button>
        )}
      </CardContent>

      {connected && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Conectado com sucesso!
        </div>
      )}
      {errorCode && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {ERROR_MESSAGES[errorCode] ?? "Não foi possível conectar."}
        </div>
      )}
    </Card>
  );
}
