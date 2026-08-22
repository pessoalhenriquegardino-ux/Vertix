"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateInputValue } from "@/lib/utils";
import type { ActionState } from "@/actions/clients";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar lançamento"}
    </Button>
  );
}

export function CampaignEntryForm({
  action,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" required defaultValue={toDateInputValue(new Date())} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaignName">Nome da campanha</Label>
          <Input id="campaignName" name="campaignName" defaultValue="Geral" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="amountSpent">Valor gasto (R$)</Label>
          <Input id="amountSpent" name="amountSpent" type="number" step="0.01" min="0" required defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="impressions">Impressões</Label>
          <Input id="impressions" name="impressions" type="number" min="0" required defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clicks">Cliques</Label>
          <Input id="clicks" name="clicks" type="number" min="0" required defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="results">Resultados</Label>
          <Input id="results" name="results" type="number" min="0" required defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reach">Alcance (opcional)</Label>
          <Input id="reach" name="reach" type="number" min="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="frequency">Frequência (opcional)</Label>
          <Input id="frequency" name="frequency" type="number" step="0.01" min="0" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
      <p className="text-xs text-muted-foreground">
        CTR, CPC, CPM e custo por resultado são calculados automaticamente a partir desses números.
        Lançar de novo na mesma data + campanha atualiza o registro.
      </p>
    </form>
  );
}
