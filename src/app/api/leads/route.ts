import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";
import { normalizePhoneDigits } from "@/lib/whatsapp";
import { parseStageInput } from "@/lib/leads";
import { notifyClientNewLead } from "@/lib/push";

// Recebe leads de automações externas autenticadas por API Key (o
// primeiro caso de uso: um agente de IA no WhatsApp de um cliente,
// rodando no n8n). Não usa sessão/login — quem chama é uma automação,
// não um usuário logado no CRM.
const bodySchema = z.object({
  nome: z
    .string({ required_error: "Campo 'nome' é obrigatório." })
    .trim()
    .min(1, "Campo 'nome' é obrigatório."),
  telefone: z
    .string({ required_error: "Campo 'telefone' é obrigatório." })
    .trim()
    .min(1, "Campo 'telefone' é obrigatório."),
  origem: z.string().trim().optional(),
  status: z.string().trim().optional(),
  // Valor do contrato fechado — só faz sentido quando status = "Sucesso"
  // (mesmo campo "value" preenchido manualmente na tela ao mover um lead
  // pra Sucesso, ver won-value-dialog.tsx / updateLeadStage).
  valorContrato: z.coerce
    .number({ invalid_type_error: "Campo 'valorContrato' deve ser um número." })
    .min(0, "Campo 'valorContrato' não pode ser negativo.")
    .optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { client } = auth;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido, esperado JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const normalizedPhone = normalizePhoneDigits(parsed.data.telefone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Campo 'telefone' não parece um número válido." }, { status: 400 });
  }

  const stage = parseStageInput(parsed.data.status);

  // valorContrato só é processado quando o status é "Sucesso" (WON) — em
  // qualquer outro status, é ignorado (mesma lógica de updateLeadStage: o
  // valor do lead só é alterado ao mover pra Sucesso).
  if (stage === "WON" && parsed.data.valorContrato === undefined) {
    return NextResponse.json(
      { error: "Campo 'valorContrato' é obrigatório quando o status é 'Sucesso'." },
      { status: 400 }
    );
  }
  const valorContrato = stage === "WON" ? parsed.data.valorContrato : undefined;

  const now = new Date();

  // Dedup por telefone dentro do mesmo cliente: se já existe, atualiza em
  // vez de criar duplicado (é assim que uma conversa de WhatsApp que
  // continua ao longo do tempo vira um só lead, não vários).
  const existing = await prisma.lead.findFirst({
    where: { clientId: client.id, phone: normalizedPhone },
    select: { id: true },
  });

  let lead;
  let created = false;

  if (existing) {
    lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.nome,
        source: parsed.data.origem || undefined,
        stage,
        lastInteractionAt: now,
        ...(valorContrato !== undefined ? { value: valorContrato } : {}),
      },
    });
  } else {
    created = true;
    lead = await prisma.lead.create({
      data: {
        clientId: client.id,
        name: parsed.data.nome,
        phone: normalizedPhone,
        source: parsed.data.origem || undefined,
        stage,
        createdByUserId: "api",
        lastInteractionAt: now,
        ...(valorContrato !== undefined ? { value: valorContrato } : {}),
      },
    });
  }

  if (created) {
    await notifyClientNewLead(client.id, lead.name, parsed.data.origem);
  }

  return NextResponse.json(
    {
      id: lead.id,
      nome: lead.name,
      telefone: lead.phone,
      origem: lead.source,
      status: lead.stage,
      valorContrato: lead.value !== null ? Number(lead.value) : null,
      ultimaInteracaoEm: lead.lastInteractionAt,
      criadoEm: lead.createdAt,
    },
    { status: created ? 201 : 200 }
  );
}
