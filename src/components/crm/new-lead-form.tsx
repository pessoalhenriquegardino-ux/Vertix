"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { ActionState } from "@/actions/clients";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Criando..." : "Criar lead"}
    </Button>
  );
}

export function NewLeadForm({
  action,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(action, undefined);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Novo lead
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="space-y-3 pt-6">
        <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source">Origem</Label>
            <Input id="source" name="source" placeholder="Meta Ads, indicação..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="value">Valor potencial (R$)</Label>
            <Input id="value" name="value" type="number" step="0.01" min="0" />
          </div>
          {state?.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <SubmitButton />
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
