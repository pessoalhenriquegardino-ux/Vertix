"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, Phone, MessageCircle, Mail, Users2, StickyNote, CheckCircle2, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_LABELS, type PendingCadence } from "@/lib/leads";
import { formatDateBR, cn } from "@/lib/utils";
import type { ActionState } from "@/actions/clients";
import { RegisterActionForm } from "@/components/crm/register-action-form";

const TYPE_ICON: Record<string, LucideIcon> = {
  CALL: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  MEETING: Users2,
  NOTE: StickyNote,
};

function RescheduleSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

function RescheduleForm({
  action,
  activityId,
  defaultType,
  defaultDate,
  onDone,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  activityId: string;
  defaultType: string;
  defaultDate: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="mt-3 space-y-2 rounded-lg border border-border bg-muted/40 p-3">
      <input type="hidden" name="activityId" value={activityId} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="type" className="text-[11px]">Canal</Label>
          <Select id="type" name="type" defaultValue={defaultType} className="h-9 text-sm">
            {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="scheduledAt" className="text-[11px]">Nova data</Label>
          <Input id="scheduledAt" name="scheduledAt" type="date" defaultValue={defaultDate} className="h-9 text-sm" />
        </div>
      </div>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <RescheduleSubmit />
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function CadencePanel({
  pending,
  rescheduleAction,
  registerAction,
}: {
  pending: PendingCadence | null;
  rescheduleAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  registerAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [registering, setRegistering] = useState(false);

  const Icon = pending ? TYPE_ICON[pending.type] ?? StickyNote : CheckCircle2;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Cadência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!registering && (
          <>
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  pending ? (pending.overdue ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600") : "bg-emerald-50 text-emerald-600"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                {pending ? (
                  <>
                    <p className="text-sm font-medium text-foreground">{pending.note || ACTIVITY_LABELS[pending.type]}</p>
                    <p className="text-xs text-muted-foreground">{ACTIVITY_LABELS[pending.type]}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          pending.overdue ? "bg-red-100 text-red-700" : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {pending.overdue && <AlertTriangle className="h-3 w-3" />}
                        {formatDateBR(pending.scheduledAt)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma etapa de cadência definida.</p>
                )}
              </div>
              {pending && (
                <button
                  onClick={() => setAdjusting((v) => !v)}
                  className="shrink-0 text-[12px] font-medium text-primary hover:underline"
                >
                  Ajustar
                </button>
              )}
            </div>

            {adjusting && pending && (
              <RescheduleForm
                action={rescheduleAction}
                activityId={pending.activityId}
                defaultType={pending.type}
                defaultDate={pending.scheduledAt.toISOString().slice(0, 10)}
                onDone={() => setAdjusting(false)}
              />
            )}

            <Button variant="outline" className="w-full" onClick={() => setRegistering(true)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Registrar ação executada
            </Button>
          </>
        )}

        {registering && (
          <RegisterActionForm
            action={registerAction}
            pendingActivityId={pending?.activityId}
            defaultType={pending?.type}
            onDone={() => setRegistering(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
