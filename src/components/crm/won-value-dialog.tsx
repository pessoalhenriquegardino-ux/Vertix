"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WonValueDialog({
  leadName,
  defaultValue,
  submitting,
  onConfirm,
  onCancel,
}: {
  leadName: string;
  defaultValue: number | null;
  submitting: boolean;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue !== null ? String(defaultValue) : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-row items-center gap-2.5 space-y-0 pb-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Trophy className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </div>
          <CardTitle className="text-base text-foreground">Contrato fechado 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Qual o valor do contrato fechado com <strong>{leadName}</strong>? Isso alimenta a receita e o ROAS na
            aba Campanhas.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="won-value">Valor do contrato (R$)</Label>
            <Input
              id="won-value"
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={submitting}
              onClick={() => onConfirm(Math.max(0, Number(value) || 0))}
            >
              {submitting ? "Salvando..." : "Confirmar e marcar como Sucesso"}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
