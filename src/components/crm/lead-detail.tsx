import { Phone, Mail, Tag, Wallet, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CadencePanel } from "@/components/crm/cadence-panel";
import { ActivityHistory } from "@/components/crm/activity-history";
import { MoveToPills } from "@/components/crm/move-to-pills";
import { DeleteLeadButton } from "@/components/crm/delete-lead-button";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { type Stage, type PendingCadence } from "@/lib/leads";
import { DEFAULT_WHATSAPP_TEMPLATE, buildWhatsAppLink, fillWhatsappTemplate } from "@/lib/whatsapp";
import type { ActionState } from "@/actions/clients";

type Activity = {
  id: string;
  type: string;
  note: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  outcome: string | null;
  createdAt: Date;
};

type LeadWithActivities = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: Stage;
  value: number | null;
  notes: string | null;
  createdAt: Date;
  activities: Activity[];
};

function findPendingCadence(activities: Activity[]): PendingCadence | null {
  const pending = activities.find((a) => a.scheduledAt && !a.completedAt);
  if (!pending || !pending.scheduledAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    activityId: pending.id,
    type: pending.type,
    scheduledAt: pending.scheduledAt,
    note: pending.note,
    overdue: pending.scheduledAt < today,
  };
}

export function LeadDetail({
  lead,
  basePath,
  listPath,
  registerAction,
  rescheduleAction,
  whatsappTemplate,
}: {
  lead: LeadWithActivities;
  basePath: string;
  listPath: string;
  registerAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  rescheduleAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  whatsappTemplate?: string | null;
}) {
  const pending = findPendingCadence(lead.activities);

  const whatsappMessage = fillWhatsappTemplate(whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE, lead.name);
  const whatsappLink = lead.phone ? buildWhatsAppLink(lead.phone, whatsappMessage) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">{lead.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {lead.phone && (
              <p className="flex items-center gap-2 text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {lead.phone}
              </p>
            )}
            {lead.email && (
              <p className="flex items-center gap-2 text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {lead.email}
              </p>
            )}
            {lead.source && (
              <p className="flex items-center gap-2 text-foreground">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" /> {lead.source}
              </p>
            )}
            {lead.value !== null && (
              <p className="flex items-center gap-2 text-foreground">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" /> {formatCurrencyBRL(lead.value)}
              </p>
            )}
            {lead.notes && <p className="text-muted-foreground">{lead.notes}</p>}
            <p className="pt-1 text-xs text-muted-foreground">Criado em {formatDateBR(lead.createdAt)}</p>

            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "sm" }), "w-full gap-1.5 bg-emerald-600 text-white hover:opacity-90")}
              >
                <MessageCircle className="h-3.5 w-3.5" /> Enviar WhatsApp
              </a>
            ) : lead.phone ? (
              <p className="text-xs text-muted-foreground">Telefone com formato inválido pra abrir o WhatsApp.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Sem telefone cadastrado pra esse lead.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <MoveToPills leadId={lead.id} leadName={lead.name} currentStage={lead.stage} currentValue={lead.value} />
            <DeleteLeadButton leadId={lead.id} redirectTo={listPath} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <CadencePanel pending={pending} rescheduleAction={rescheduleAction} registerAction={registerAction} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHistory activities={lead.activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
