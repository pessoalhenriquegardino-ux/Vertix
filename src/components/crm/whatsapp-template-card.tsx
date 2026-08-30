"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { MessageCircle, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_WHATSAPP_TEMPLATE, fillWhatsappTemplate } from "@/lib/whatsapp";
import type { ActionState } from "@/actions/clients";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Salvando..." : "Salvar modelo"}
    </Button>
  );
}

export function WhatsappTemplateCard({
  currentTemplate,
  action,
}: {
  currentTemplate: string | null;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useFormState(action, undefined);
  const [draft, setDraft] = useState(currentTemplate ?? DEFAULT_WHATSAPP_TEMPLATE);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Mensagem padrão de WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Usada no botão "Enviar WhatsApp" dentro de cada lead.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp((v) => !v)}
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Como funciona <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showHelp && (
          <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              Use <code>{"{primeiro_nome}"}</code> ou <code>{"{nome}"}</code> no texto — na hora de enviar, é
              trocado automaticamente pelo nome do lead.
            </p>
            <p>Ao clicar em "Enviar WhatsApp" dentro de um lead, o WhatsApp abre com essa mensagem já pronta.</p>
          </div>
        )}

        <form action={formAction} className="space-y-2">
          <Textarea
            name="template"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={DEFAULT_WHATSAPP_TEMPLATE}
          />
          <p className="text-xs text-muted-foreground">
            Prévia: <span className="italic">{fillWhatsappTemplate(draft || DEFAULT_WHATSAPP_TEMPLATE, "Maria")}</span>
          </p>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <SaveButton />
        </form>
      </CardContent>
    </Card>
  );
}
