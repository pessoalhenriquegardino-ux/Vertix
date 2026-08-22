"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquarePlus,
  Search,
  BadgeCheck,
  FileText,
  Trophy,
  XCircle,
  AlertTriangle,
  Phone,
  MessageCircle,
  Mail,
  Users2,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { STAGES, STAGE_LABELS, ACTIVITY_LABELS, type Stage, type PendingCadence } from "@/lib/leads";
import { updateLeadStage } from "@/actions/leads";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";

export type KanbanLead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: Stage;
  value: number | null;
  updatedAt: Date;
  pendingCadence: PendingCadence | null;
};

const CADENCE_ICON: Record<string, LucideIcon> = {
  CALL: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  MEETING: Users2,
  NOTE: StickyNote,
};

const STAGE_META: Record<Stage, { color: string; dot: string; icon: LucideIcon }> = {
  NEW: { color: "border-t-indigo-400", dot: "bg-indigo-500", icon: MessageSquarePlus },
  IN_ANALYSIS: { color: "border-t-blue-400", dot: "bg-blue-500", icon: Search },
  QUALIFIED: { color: "border-t-cyan-400", dot: "bg-cyan-500", icon: BadgeCheck },
  PROPOSAL: { color: "border-t-amber-400", dot: "bg-amber-500", icon: FileText },
  WON: { color: "border-t-emerald-400", dot: "bg-emerald-500", icon: Trophy },
  LOST: { color: "border-t-red-400", dot: "bg-red-500", icon: XCircle },
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function KanbanBoard({ leads, leadBasePath }: { leads: KanbanLead[]; leadBasePath: string }) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDrop(stage: Stage) {
    setDragOverStage(null);
    if (!dragging) return;
    const leadId = dragging;
    setDragging(null);
    startTransition(async () => {
      await updateLeadStage(leadId, stage);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage);
        const meta = STAGE_META[stage];
        const Icon = meta.icon;
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
            onDrop={() => handleDrop(stage)}
            className={cn(
              "flex min-h-[220px] flex-col rounded-xl border border-t-[3px] border-border bg-muted/40 p-2.5 transition-colors",
              meta.color,
              dragOverStage === stage && "bg-accent ring-2 ring-primary/30"
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.25} />
                <h3 className="text-[12.5px] font-semibold text-foreground">{STAGE_LABELS[stage]}</h3>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {stageLeads.length}
              </Badge>
            </div>
            <div className="flex-1 space-y-2">
              {stageLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`${leadBasePath}/${lead.id}`}
                  draggable
                  onDragStart={() => setDragging(lead.id)}
                  onDragEnd={() => {
                    setDragging(null);
                    setDragOverStage(null);
                  }}
                  className={cn(
                    "block cursor-grab rounded-lg border border-border bg-card p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
                    isPending && dragging === lead.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white", meta.dot)}>
                      {initials(lead.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{lead.name}</p>
                      {lead.source && <p className="truncate text-[11px] text-muted-foreground">{lead.source}</p>}
                    </div>
                  </div>
                  {lead.value !== null && (
                    <span className="mt-2 block tabular-nums text-[11.5px] font-medium text-foreground">
                      {formatCurrencyBRL(lead.value)}
                    </span>
                  )}
                  {lead.pendingCadence ? (
                    (() => {
                      const CadenceIcon = CADENCE_ICON[lead.pendingCadence.type] ?? StickyNote;
                      return (
                        <span
                          className={cn(
                            "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                            lead.pendingCadence.overdue ? "bg-red-100 text-red-700" : "bg-secondary text-secondary-foreground"
                          )}
                        >
                          {lead.pendingCadence.overdue ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <CadenceIcon className="h-3 w-3" />
                          )}
                          {lead.pendingCadence.note || ACTIVITY_LABELS[lead.pendingCadence.type]} ·{" "}
                          {formatDateBR(lead.pendingCadence.scheduledAt)}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="mt-2 block text-[10.5px] text-muted-foreground">
                      Atualizado {formatDateBR(lead.updatedAt)}
                    </span>
                  )}
                </Link>
              ))}
              {stageLeads.length === 0 && (
                <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">Nenhum lead aqui.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
