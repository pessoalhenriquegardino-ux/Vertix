"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/actions/clients";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function ClientForm({
  action,
  defaultValues,
  submitLabel = "Salvar",
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: { name: string; segment: string | null; active: boolean };
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome do cliente</Label>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="segment">Segmento</Label>
        <Input
          id="segment"
          name="segment"
          placeholder="ex: estética, jurídico, financeiro"
          defaultValue={defaultValues?.segment ?? ""}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={defaultValues?.active ?? true}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="active">Cliente ativo</Label>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
