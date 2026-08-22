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

const numberFields: { name: string; label: string }[] = [
  { name: "leadsGenerated", label: "Nova Conversa" },
  { name: "leadsInAnalysis", label: "Análise" },
  { name: "leadsQualified", label: "Qualificado" },
  { name: "leadsProposal", label: "Proposta" },
  { name: "leadsWon", label: "Sucesso" },
  { name: "leadsLost", label: "Perdas" },
];

export function EntryForm({
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
          <Label htmlFor="adSpend">Valor gasto (R$)</Label>
          <Input id="adSpend" name="adSpend" type="number" step="0.01" min="0" required defaultValue="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {numberFields.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input id={f.name} name={f.name} type="number" min="0" step="1" required defaultValue="0" />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Input id="notes" name="notes" placeholder="Notas internas sobre o dia" />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
      <p className="text-xs text-muted-foreground">
        Lançar novamente na mesma data atualiza o registro existente (não duplica).
      </p>
    </form>
  );
}
