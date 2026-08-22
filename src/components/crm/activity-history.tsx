"use client";

import { useState } from "react";
import { ChevronDown, Phone, MessageCircle, Mail, Users2, StickyNote, Clock, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_LABELS, OUTCOME_LABELS, type Outcome } from "@/lib/leads";
import { formatDateBR, cn } from "@/lib/utils";

const TYPE_ICON: Record<string, LucideIcon> = {
  CALL: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  MEETING: Users2,
  NOTE: StickyNote,
};

const OUTCOME_BADGE: Record<Outcome, "success" | "destructive" | "outline" | "secondary"> = {
  RESPONDED: "success",
  NOT_RESPONDED: "destructive",
  SCHEDULED: "outline",
  NOT_INTERESTED: "destructive",
  NO_ANSWER: "secondary",
};

type Activity = {
  id: string;
  type: string;
  note: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  outcome: string | null;
  createdAt: Date;
};

export function ActivityHistory({ activities }: { activities: Activity[] }) {
  const [open, setOpen] = useState(activities.length <= 3);

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <Clock className="h-3.5 w-3.5" /> Histórico ({activities.length})
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {activities.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? StickyNote;
            const isPending = a.scheduledAt && !a.completedAt;
            return (
              <div key={a.id} className="flex items-start gap-2.5 border-b border-border pb-3 last:border-0">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[13px] font-medium text-foreground">{ACTIVITY_LABELS[a.type] ?? a.type}</p>
                    {a.outcome && (
                      <Badge variant={OUTCOME_BADGE[a.outcome as Outcome]}>
                        {OUTCOME_LABELS[a.outcome as Outcome] ?? a.outcome}
                      </Badge>
                    )}
                    {isPending && <Badge variant="outline">Agendada</Badge>}
                  </div>
                  {a.note && <p className="mt-0.5 text-[13px] text-muted-foreground">{a.note}</p>}
                  {a.scheduledAt && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Follow-up: {formatDateBR(a.scheduledAt)}</p>
                  )}
                </div>
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDateBR(a.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
