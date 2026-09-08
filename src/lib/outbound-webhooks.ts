import type { Lead } from "@prisma/client";

// ───────────────────────── extração das respostas do formulário ─────────────────────────
// As perguntas do formulário instantâneo do Meta chegam com o texto exato
// que o cliente escreveu ao criar o formulário. Casamos por palavra-chave
// (contém, não é igual exato) dentro do texto normalizado da pergunta —
// então pequenas variações de redação ainda funcionam, mas mudanças
// grandes na pergunta exigem ajustar as keywords aqui.
function normalizeQuestion(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function parseBooleanPt(raw: string): boolean | null {
  const v = normalizeQuestion(raw);
  if (["sim", "yes", "true", "1"].includes(v)) return true;
  if (["nao", "no", "false", "0"].includes(v)) return false;
  return null;
}

function findAnswerByKeywords(answers: Record<string, string>, keywords: string[]): string | null {
  for (const [question, answer] of Object.entries(answers)) {
    const normalizedQuestion = normalizeQuestion(question);
    if (keywords.some((k) => normalizedQuestion.includes(k))) {
      return answer;
    }
  }
  return null;
}

// ───────────────────────── mapeamento por cliente ─────────────────────────
// Cada cliente pode ter um formulário com perguntas diferentes — por isso
// o mapeamento (quais palavras-chave procurar, quais nomes de campo
// resultam) é configurado por clientId, não genérico pro sistema todo.

type ClientFormMapping = {
  clientId: string;
  // nome da env var que guarda a URL do webhook de saída desse cliente.
  webhookUrlEnvVar: string;
  extract: (answers: Record<string, string>) => Record<string, boolean | string | null>;
};

// Dra. Anelise - Auxílio Acidente. Formulário simplificado (6 perguntas:
// nome, telefone + estas 4 de sim/não).
const ANELISE_ACIDENTE_CLIENT_ID = "cmtll3i6p000813gxquvnvmhn";

function extractAneliseAcidenteFormAnswers(answers: Record<string, string>) {
  const sofreuRaw = findAnswerByKeywords(answers, ["sofreu algum acidente", "sofreu algum tipo de acidente", "sofreu acidente"]);
  const registradoRaw = findAnswerByKeywords(answers, ["registrad", "clt", "carteira assinada", "carteira de trabalho"]);
  const auxilioRaw = findAnswerByKeywords(answers, ["auxilio-doenca", "auxilio doenca", "beneficio do inss", "recebeu auxilio"]);
  const sequelaRaw = findAnswerByKeywords(answers, ["sequela"]);

  return {
    sofreuAcidente: sofreuRaw !== null ? parseBooleanPt(sofreuRaw) : null,
    estavaRegistrado: registradoRaw !== null ? parseBooleanPt(registradoRaw) : null,
    recebeuAuxilioDoenca: auxilioRaw !== null ? parseBooleanPt(auxilioRaw) : null,
    ficouComSequela: sequelaRaw !== null ? parseBooleanPt(sequelaRaw) : null,
  };
}

const CLIENT_FORM_MAPPINGS: ClientFormMapping[] = [
  {
    clientId: ANELISE_ACIDENTE_CLIENT_ID,
    webhookUrlEnvVar: "N8N_WEBHOOK_NOVO_LEAD_ANELISE_ACIDENTE",
    extract: extractAneliseAcidenteFormAnswers,
  },
];

// Devolve as respostas do formulário já estruturadas (nomes de campo
// limpos, booleanos) pro cliente em questão. null se esse cliente não
// tiver mapeamento configurado (nesse caso, use o formAnswers cru).
export function extractStructuredFormAnswers(
  clientId: string,
  rawAnswers: Record<string, string> | null | undefined
): Record<string, boolean | string | null> | null {
  const mapping = CLIENT_FORM_MAPPINGS.find((m) => m.clientId === clientId);
  if (!mapping) return null;
  return mapping.extract(rawAnswers ?? {});
}

// ───────────────────────── webhook de saída ─────────────────────────
// Notifica um agente de IA no n8n toda vez que um lead novo chega pelo
// formulário instantâneo do Meta Ads, pro cliente em questão — só dispara
// se ele tiver mapeamento configurado acima E a env var da URL estiver
// definida. Enquanto não tiver, ignora silenciosamente (sem erro).
export async function sendNewLeadOutboundWebhook(lead: Lead, rawFormAnswers: Record<string, string>) {
  const mapping = CLIENT_FORM_MAPPINGS.find((m) => m.clientId === lead.clientId);
  if (!mapping) return;

  const webhookUrl = process.env[mapping.webhookUrlEnvVar];
  if (!webhookUrl) return;

  const payload = {
    leadId: lead.id,
    nome: lead.name,
    telefone: lead.phone,
    status: lead.stage,
    origem: lead.source,
    formAnswers: mapping.extract(rawFormAnswers),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    // best effort — não pode travar o processamento do lead por causa de
    // uma falha no n8n.
    console.error("Falha ao enviar webhook de saída:", err);
  }
}
