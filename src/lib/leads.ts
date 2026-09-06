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

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Aceita tanto a chave do enum (NEW, QUALIFIED...) quanto o rótulo em
// português usado no dashboard ("Nova Conversa", "Qualificado"...) —
// usado pela API externa de leads (n8n etc.), que pode mandar qualquer um
// dos dois. Se não reconhecer, cai em "NEW".
export function parseStageInput(input?: string | null): Stage {
  if (!input) return "NEW";
  const normalized = normalizeForMatch(input);

  const byKey = STAGES.find((s) => s.toLowerCase() === normalized);
  if (byKey) return byKey;

  const byLabel = STAGES.find((s) => normalizeForMatch(STAGE_LABELS[s]) === normalized);
  if (byLabel) return byLabel;

  return "NEW";
}

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

// Leads marcados como "Sucesso" (fechados) num período — fonte de verdade
// para CPA (custo por contrato) e ROAS (receita ÷ gasto) nas Campanhas.
export async function getWonLeadsStats(clientId: string, range: { from: Date; to: Date }) {
  const endInclusive = new Date(range.to);
  endInclusive.setUTCHours(23, 59, 59, 999);

  // usa updatedAt (não createdAt): representa quando o lead foi marcado como
  // fechado, não quando entrou no funil — é o que faz sentido pra CPA/ROAS
  // do período.
  const won = await prisma.lead.findMany({
    where: { clientId, stage: "WON", updatedAt: { gte: range.from, lte: endInclusive } },
    select: { value: true },
  });

  return {
    count: won.length,
    revenue: won.reduce((a, l) => a + (l.value ? Number(l.value) : 0), 0),
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
