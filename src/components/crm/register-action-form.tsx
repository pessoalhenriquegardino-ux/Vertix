"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, XCircle, CalendarCheck, ThumbsDown, HelpCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACTIVITY_LABELS, OUTCOMES, OUTCOME_LABELS, type Outcome } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/actions/clients";

const OUTCOME_ICON: Record<Outcome, LucideIcon> = {
  RESPONDED: CheckCircle2,
  NOT_RESPONDED: XCircle,
  SCHEDULED: CalendarCheck,
  NOT_INTERESTED: ThumbsDown,
  NO_ANSWER: HelpCircle,
};

const OUTCOME_STYLE: Record<Outcome, string> = {
  RESPONDED: "border-emerald-300 bg-emerald-50 text-emerald-700 data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  NOT_RESPONDED: "border-red-300 bg-red-50 text-red-700 data-[active=true]:bg-red-600 data-[active=true]:text-white",
  SCHEDULED: "border-blue-300 bg-blue-50 text-blue-700 data-[active=true]:bg-blue-600 data-[active=true]:text-white",
  NOT_INTERESTED: "border-orange-300 bg-orange-50 text-orange-700 data-[active=true]:bg-orange-600 data-[active=true]:text-white",
  NO_ANSWER: "border-slate-300 bg-slate-50 text-slate-700 data-[active=true]:bg-slate-700 data-[active=true]:text-white",
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full">
      {pending ? "Salvando..." : "Salvar registro"}
    </Button>
  );
}

export function RegisterActionForm({
  action,
  pendingActivityId,
  defaultType,
  onDone,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  pendingActivityId?: string;
  defaultType?: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(action, undefined);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [scheduleNext, setScheduleNext] = useState(false);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-primary/30 bg-accent/40 p-3">
      {pendingActivityId && <input type="hidden" name="pendingActivityId" value={pendingActivityId} />}
      <input type="hidden" name="outcome" value={outcome ?? ""} />

      <div className="space-y-1">
        <Label htmlFor="actionType" className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Ação executada
        </Label>
        <Select id="actionType" name="actionType" defaultValue={defaultType ?? "CALL"} className="h-9 text-sm">
          {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Resultado</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {OUTCOMES.map((o) => {
            const Icon = OUTCOME_ICON[o];
            const active = outcome === o;
            return (
              <button
                key={o}
                type="button"
                data-active={active}
                onClick={() => setOutcome(o)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  OUTCOME_STYLE[o]
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {OUTCOME_LABELS[o]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="note" className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Observação (opcional)
        </Label>
        <Input id="note" name="note" placeholder="O que aconteceu nesse contato?" className="h-9 text-sm" />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={scheduleNext}
          onChange={(e) => setScheduleNext(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-input"
        />
        Agendar próxima ação de cadência
      </label>

      {scheduleNext && (
        <div className="grid grid-cols-2 gap-2 rounded-md bg-background/70 p-2">
          <div className="space-y-1">
            <Label htmlFor="nextType" className="text-[11px]">Canal</Label>
            <Select id="nextType" name="nextType" defaultValue={defaultType ?? "CALL"} className="h-9 text-sm">
              {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nextDate" className="text-[11px]">Data</Label>
            <Input id="nextDate" name="nextDate" type="date" className="h-9 text-sm" />
          </div>
        </div>
      )}

      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton disabled={!outcome} />
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
