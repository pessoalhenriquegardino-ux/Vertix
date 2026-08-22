import { prisma } from "@/lib/prisma";

export const STAGES = ["NEW", "IN_ANALYSIS", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  NEW: "Nova Conversa",
  IN_ANALYSIS: "Análise",
  QUALIFIED: "Qualificado",
  PROPOSAL: "Proposta",
  WON: "Sucesso",
  LOST: "Perdas",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  CALL: "Ligação",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  MEETING: "Reunião",
  NOTE: "Nota",
};

export const OUTCOMES = ["RESPONDED", "NOT_RESPONDED", "SCHEDULED", "NOT_INTERESTED", "NO_ANSWER"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_LABELS: Record<Outcome, string> = {
  RESPONDED: "Respondeu",
  NOT_RESPONDED: "Não respondeu",
  SCHEDULED: "Agendou",
  NOT_INTERESTED: "Desinteressado",
  NO_ANSWER: "Sem resposta",
};

export type PendingCadence = {
  activityId: string;
  type: string;
  scheduledAt: Date;
  note: string | null;
  overdue: boolean;
};

function toPendingCadence(activity: { id: string; type: string; scheduledAt: Date | null; note: string | null } | undefined): PendingCadence | null {
  if (!activity || !activity.scheduledAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    activityId: activity.id,
    type: activity.type,
    scheduledAt: activity.scheduledAt,
    note: activity.note,
    overdue: activity.scheduledAt < today,
  };
}

export async function getLeadsForClient(clientId: string) {
  const leads = await prisma.lead.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
    include: {
      activities: {
        where: { completedAt: null, scheduledAt: { not: null } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
      },
    },
  });

  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    source: l.source,
    stage: l.stage as Stage,
    value: l.value ? Number(l.value) : null,
    notes: l.notes,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    pendingCadence: toPendingCadence(l.activities[0]),
  }));
}

export type LeadsKpis = {
  totalLeads: number;
  conversionRate: number; // % de leads em WON sobre o total
  pipelineValue: number; // soma do valor dos leads ainda em aberto (não WON/LOST)
  closedRevenue: number; // soma do valor dos leads WON
};

export function computeLeadsKpis(leads: { stage: Stage; value: number | null }[]): LeadsKpis {
  const totalLeads = leads.length;
  const won = leads.filter((l) => l.stage === "WON");
  const open = leads.filter((l) => l.stage !== "WON" && l.stage !== "LOST");

  return {
    totalLeads,
    conversionRate: totalLeads > 0 ? (won.length / totalLeads) * 100 : 0,
    pipelineValue: open.reduce((a, l) => a + (l.value ?? 0), 0),
    closedRevenue: won.reduce((a, l) => a + (l.value ?? 0), 0),
  };
}

export async function getLeadDetail(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
  return lead;
}
