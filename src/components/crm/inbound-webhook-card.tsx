"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, RefreshCw, Zap, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { regenerateWebhookToken } from "@/actions/webhook-token";

export function InboundWebhookCard({ clientId, webhookToken }: { clientId: string; webhookToken: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Monta a URL só depois de montar no cliente — evita hydration mismatch,
  // já que o servidor não sabe a origin (window não existe lá).
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/api/leads/inbound?token=${webhookToken}`);
  }, [webhookToken]);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Zap className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Link de recebimento (Zapier / Make / n8n)</p>
              <p className="text-xs text-muted-foreground">
                Alternativa ao Meta direto — funciona sem precisar de aprovação de App.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Como usar no Zapier <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {url}
          </code>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await regenerateWebhookToken(clientId, window.location.pathname);
                router.refresh();
              })
            }
            title="Gerar um link novo (invalida o atual)"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {showHelp && (
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              <strong>1.</strong> No Zapier, crie um Zap com gatilho <strong>"New Lead in Facebook Lead Ads"</strong>{" "}
              (conecte sua conta do Meta lá — é a integração oficial deles).
            </p>
            <p>
              <strong>2.</strong> Adicione uma ação <strong>"Webhooks by Zapier" → "POST"</strong>.
            </p>
            <p>
              <strong>3.</strong> Cole o link acima em "URL".
            </p>
            <p>
              <strong>4.</strong> Em "Data" (formato JSON), mapeie os campos do lead pra estes nomes:{" "}
              <code>name</code>, <code>email</code>, <code>phone</code>. Qualquer outro campo do formulário vira
              anotação automática no lead.
            </p>
            <p>
              <strong>5.</strong> Publique o Zap. Pronto — todo novo lead cai aqui automaticamente em "Nova
              Conversa".
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
