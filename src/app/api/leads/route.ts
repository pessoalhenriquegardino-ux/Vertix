import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";
import { normalizePhoneDigits } from "@/lib/whatsapp";
import { parseStageInput, isStageRegression } from "@/lib/leads";
import { notifyClientNewLead } from "@/lib/push";
import { extractStructuredFormAnswers } from "@/lib/outbound-webhooks";

// Recebe leads de automações externas autenticadas por API Key (o
// primeiro caso de uso: um agente de IA no WhatsApp de um cliente,
// rodando no n8n). Não usa sessão/login — quem chama é uma automação,
// não um usuário logado no CRM.
// 'telefone' e 'origem' também podem vir via query string (?telefone=...
// &origem=...), como alternativa ao body — útil pra automações que montam
// a URL dinamicamente. Por isso são opcionais aqui: a obrigatoriedade de
// 'telefone' é checada depois de mesclar body + query (body tem prioridade).
// 'nome' também é opcional aqui — só é exigido de verdade na criação de um
// lead novo (checado depois de saber se o telefone já existe ou não);
// numa atualização, se não vier, mantém o nome que já estava salvo.
//
// cpf/rg/endereco/estadoCivil/profissao/observacao: dados cadastrais
// opcionais, preenchidos aos poucos. Isso já É um PATCH parcial — cada
// chamada só sobrescreve os campos que vierem preenchidos; o resto do
// registro permanece intacto (mesmo padrão do 'nome' opcional acima). Não
// existe um método HTTP PATCH separado: o mesmo POST cobre criar e
// atualizar parcialmente, consistente com o resto do endpoint.
const bodySchema = z.object({
  nome: z.string().trim().min(1, "Campo 'nome' não pode ser vazio.").optional(),
  telefone: z.string().trim().min(1).optional(),
  origem: z.string().trim().min(1).optional(),
  status: z.string().trim().optional(),
  // Valor do contrato fechado — só faz sentido quando status = "Sucesso"
  // (mesmo campo "value" preenchido manualmente na tela ao mover um lead
  // pra Sucesso, ver won-value-dialog.tsx / updateLeadStage).
  valorContrato: z.coerce
    .number({ invalid_type_error: "Campo 'valorContrato' deve ser um número." })
    .min(0, "Campo 'valorContrato' não pode ser negativo.")
    .optional(),
  cpf: z.string().trim().min(1, "Campo 'cpf' não pode ser vazio.").optional(),
  rg: z.string().trim().min(1, "Campo 'rg' não pode ser vazio.").optional(),
  endereco: z.string().trim().min(1, "Campo 'endereco' não pode ser vazio.").optional(),
  estadoCivil: z.string().trim().min(1, "Campo 'estadoCivil' não pode ser vazio.").optional(),
  profissao: z.string().trim().min(1, "Campo 'profissao' não pode ser vazio.").optional(),
  observacao: z.string().trim().min(1, "Campo 'observacao' não pode ser vazio.").optional(),
});

function serializeLead(lead: Lead) {
  return {
    id: lead.id,
    nome: lead.name,
    telefone: lead.phone,
    email: lead.email,
    origem: lead.source,
    status: lead.stage,
    valorContrato: lead.value !== null ? Number(lead.value) : null,
    cpf: lead.cpf,
    rg: lead.rg,
    endereco: lead.endereco,
    estadoCivil: lead.estadoCivil,
    profissao: lead.profissao,
    observacao: lead.observacao,
    // respostas do formulário do Meta, já interpretadas com nomes de
    // campo limpos — só preenchido pra clientes com mapeamento configurado
    // (ver src/lib/outbound-webhooks.ts); null pros demais.
    respostasFormulario: extractStructuredFormAnswers(lead.clientId, lead.formAnswers as Record<string, string> | null),
    // respostas cruas (pergunta → resposta), como vieram do formulário —
    // útil se a automação precisar de alguma pergunta que ainda não tem
    // um campo estruturado próprio.
    formAnswers: lead.formAnswers ?? null,
    ultimaInteracaoEm: lead.lastInteractionAt,
    criadoEm: lead.createdAt,
  };
}

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

  // body tem prioridade sobre query string; se não vier no body, cai pro
  // valor da query (?telefone=...&origem=...), se houver.
  const telefone = parsed.data.telefone || req.nextUrl.searchParams.get("telefone")?.trim() || undefined;
  const origem = parsed.data.origem || req.nextUrl.searchParams.get("origem")?.trim() || undefined;

  if (!telefone) {
    return NextResponse.json(
      { error: "Campo 'telefone' é obrigatório (no corpo ou na query string)." },
      { status: 400 }
    );
  }

  const normalizedPhone = normalizePhoneDigits(telefone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Campo 'telefone' não parece um número válido." }, { status: 400 });
  }

  const intendedStage = parseStageInput(parsed.data.status);

  // valorContrato só é processado quando o status é "Sucesso" (WON) — em
  // qualquer outro status, é ignorado (mesma lógica de updateLeadStage: o
  // valor do lead só é alterado ao mover pra Sucesso). "Sucesso" nunca é
  // considerado regressão (é o topo do funil), então essa checagem vale
  // tanto pra criação quanto pra atualização.
  if (intendedStage === "WON" && parsed.data.valorContrato === undefined) {
    return NextResponse.json(
      { error: "Campo 'valorContrato' é obrigatório quando o status é 'Sucesso'." },
      { status: 400 }
    );
  }

  const now = new Date();

  // Dedup por telefone dentro do mesmo cliente: se já existe, atualiza em
  // vez de criar duplicado (é assim que uma conversa de WhatsApp que
  // continua ao longo do tempo vira um só lead, não vários).
  const existing = await prisma.lead.findFirst({
    where: { clientId: client.id, phone: normalizedPhone },
    select: {
      id: true,
      name: true,
      stage: true,
      cpf: true,
      rg: true,
      endereco: true,
      estadoCivil: true,
      profissao: true,
      observacao: true,
    },
  });

  // 'nome' só é obrigatório de verdade na criação — numa atualização, se
  // não vier, mantém o nome já salvo.
  if (!existing && !parsed.data.nome) {
    return NextResponse.json(
      { error: "Campo 'nome' é obrigatório ao criar um lead novo (telefone ainda não cadastrado)." },
      { status: 400 }
    );
  }

  let lead;
  let created = false;

  if (existing) {
    // Proteção contra regressão: só aplica a mudança de status se o novo
    // estágio for >= o atual (ou for "Perdas", sempre permitido). Se for
    // uma tentativa de voltar estágio, ignora a mudança silenciosamente —
    // sem erro — mas ainda assim registra a interação (lastInteractionAt).
    const stage = isStageRegression(existing.stage, intendedStage) ? existing.stage : intendedStage;
    const valorContrato = intendedStage === "WON" ? parsed.data.valorContrato : undefined;

    lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.nome || existing.name,
        source: origem,
        stage,
        lastInteractionAt: now,
        cpf: parsed.data.cpf || existing.cpf,
        rg: parsed.data.rg || existing.rg,
        endereco: parsed.data.endereco || existing.endereco,
        estadoCivil: parsed.data.estadoCivil || existing.estadoCivil,
        profissao: parsed.data.profissao || existing.profissao,
        observacao: parsed.data.observacao || existing.observacao,
        ...(valorContrato !== undefined ? { value: valorContrato } : {}),
      },
    });
  } else {
    created = true;
    const valorContrato = intendedStage === "WON" ? parsed.data.valorContrato : undefined;

    lead = await prisma.lead.create({
      data: {
        clientId: client.id,
        name: parsed.data.nome!,
        phone: normalizedPhone,
        source: origem,
        stage: intendedStage,
        createdByUserId: "api",
        lastInteractionAt: now,
        cpf: parsed.data.cpf,
        rg: parsed.data.rg,
        endereco: parsed.data.endereco,
        estadoCivil: parsed.data.estadoCivil,
        profissao: parsed.data.profissao,
        observacao: parsed.data.observacao,
        ...(valorContrato !== undefined ? { value: valorContrato } : {}),
      },
    });
  }

  if (created) {
    await notifyClientNewLead(client.id, lead.name, origem);
  }

  return NextResponse.json(serializeLead(lead), { status: created ? 201 : 200 });
}

function serializeLeadSummary(lead: Lead) {
  return {
    id: lead.id,
    nome: lead.name,
    telefone: lead.phone,
    status: lead.stage,
    origem: lead.source,
    respostasFormulario: extractStructuredFormAnswers(lead.clientId, lead.formAnswers as Record<string, string> | null),
    formAnswers: lead.formAnswers ?? null,
    ultimaInteracaoEm: lead.lastInteractionAt,
    criadoEm: lead.createdAt,
  };
}

const MAX_LIST_RESULTS = 500;

// Dois modos, no mesmo GET:
//
// 1) ?telefone=X → busca um lead único (chave de identidade usada pelo
//    POST pra dedupe). 'origem' é aceito na query por simetria mas não
//    filtra — a busca é sempre por telefone dentro do cliente autenticado.
//
// 2) sem 'telefone' → modo lista, filtrando por 'status' e/ou 'origem'
//    (os dois opcionais e combináveis; sem nenhum filtro, lista os leads
//    mais recentes do cliente, até MAX_LIST_RESULTS). Pensado pra
//    processar em lote leads antigos que nunca vão receber o webhook de
//    saída (ele só dispara em leads novos a partir de agora).
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { client } = auth;

  const telefoneParam = req.nextUrl.searchParams.get("telefone")?.trim();

  if (telefoneParam) {
    const normalizedPhone = normalizePhoneDigits(telefoneParam);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Parâmetro 'telefone' não parece um número válido." }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { clientId: client.id, phone: normalizedPhone },
    });

    if (!lead) {
      return NextResponse.json({ error: "Nenhum lead encontrado com esse telefone." }, { status: 404 });
    }

    return NextResponse.json(serializeLead(lead));
  }

  // modo lista
  const statusParam = req.nextUrl.searchParams.get("status")?.trim();
  const origemParam = req.nextUrl.searchParams.get("origem")?.trim();

  const where: { clientId: string; stage?: ReturnType<typeof parseStageInput>; source?: string } = {
    clientId: client.id,
  };
  if (statusParam) where.stage = parseStageInput(statusParam);
  if (origemParam) where.source = origemParam;

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "asc" }, // mais antigos primeiro — útil pra processar backlog em ordem
    take: MAX_LIST_RESULTS,
  });

  return NextResponse.json({
    total: leads.length,
    truncado: leads.length === MAX_LIST_RESULTS,
    leads: leads.map(serializeLeadSummary),
  });
}
