"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { deleteClient } from "@/actions/clients";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const canConfirm = confirmText.trim() === clientName;

  if (!open) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir cliente
      </Button>
    );
  }

  return (
    <Card className="border-destructive/40">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start gap-2.5 rounded-md bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Isso apaga <strong>{clientName}</strong> e tudo ligado a ele — login(s), lançamentos de pipeline,
            métricas de campanhas e todos os leads do CRM. Não pode ser desfeito.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Pra confirmar, digite o nome do cliente: <strong>{clientName}</strong>
          </label>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={clientName} />
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={!canConfirm || isPending}
            onClick={() =>
              startTransition(async () => {
                await deleteClient(clientId);
                router.push("/admin/clients");
              })
            }
          >
            {isPending ? "Excluindo..." : "Confirmar exclusão definitiva"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
