"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, RefreshCw, KeyRound, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { regenerateApiKey } from "@/actions/api-key";

export function ApiKeyCard({ clientId, apiKey }: { clientId: string; apiKey: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isPending, startTransition] = useTransition();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const curlPost = `curl -X POST "${baseUrl}/api/leads" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "Maria Silva", "telefone": "11987654321", "origem": "whatsapp-ia", "status": "Nova Conversa"}'`;

  const curlWon = `curl -X POST "${baseUrl}/api/leads" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "Maria Silva", "telefone": "11987654321", "status": "Sucesso", "valorContrato": 1500.00}'`;

  const curlGet = `curl "${baseUrl}/api/leads/inativos?horas=24" \\
  -H "Authorization: Bearer ${apiKey}"`;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <KeyRound className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">API de leads (automações externas)</p>
              <p className="text-xs text-muted-foreground">
                Pra agentes de IA, n8n ou outras automações enviarem leads direto pro CRM.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver exemplos <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {apiKey}
          </code>
          <Button variant="outline" size="sm" onClick={() => copy(apiKey, "key")}>
            {copied === "key" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await regenerateApiKey(clientId, window.location.pathname);
                router.refresh();
              })
            }
            title="Gerar uma chave nova (invalida a atual)"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showHelp && (
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              Envie a chave no header <code className="rounded bg-background px-1 py-0.5">Authorization: Bearer &lt;api_key&gt;</code>{" "}
              (ou <code className="rounded bg-background px-1 py-0.5">x-api-key</code>).
            </p>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-foreground">Criar/atualizar um lead</span>
                <button onClick={() => copy(curlPost, "post")} className="text-primary hover:underline">
                  {copied === "post" ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-background p-2 text-[11px] leading-relaxed">{curlPost}</pre>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-foreground">Marcar como Sucesso (com valor do contrato)</span>
                <button onClick={() => copy(curlWon, "won")} className="text-primary hover:underline">
                  {copied === "won" ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-background p-2 text-[11px] leading-relaxed">{curlWon}</pre>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-foreground">Leads sem resposta há X horas</span>
                <button onClick={() => copy(curlGet, "get")} className="text-primary hover:underline">
                  {copied === "get" ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-background p-2 text-[11px] leading-relaxed">{curlGet}</pre>
            </div>

            <p>
              O campo <code className="rounded bg-background px-1 py-0.5">status</code> aceita "Nova Conversa",
              "Análise", "Qualificado", "Proposta", "Sucesso" ou "Perdas" (se omitido, entra como "Nova Conversa").
              Se já existir um lead com o mesmo telefone, ele é atualizado em vez de duplicado.
            </p>
            <p>
              O campo <code className="rounded bg-background px-1 py-0.5">valorContrato</code> só é considerado
              quando <code className="rounded bg-background px-1 py-0.5">status</code> é "Sucesso" — nesse caso é
              obrigatório. Em qualquer outro status, é ignorado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
