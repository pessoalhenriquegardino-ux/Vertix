import type { Lead } from "@prisma/client";

// ───────────────────────── extração das respostas do formulário ─────────────────────────
// As perguntas do formulário instantâneo do Meta chegam com o texto exato
// que o cliente escreveu ao criar o formulário — não tem como saber a
// palavra-por-palavra de antemão. Por isso, casamos por palavra-chave
// (contém, não é igual exato) dentro do texto normalizado da pergunta.
//
// IMPORTANTE: essas palavras-chave são um ponto de partida — ajuste aqui
// assim que soubermos o texto exato das perguntas do formulário real da
// Ribeiro & Genro (me manda o texto das 4 perguntas que eu calibro certinho).
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

export type RibeiroGenroFormAnswers = {
  cltAtivaNaEpocaDoAcidente: boolean | null;
  sequelaPermanente: boolean | string | null;
  documentacaoMedicaDisponivel: boolean | null;
  jaRecebeuAuxilioDoenca: boolean | null;
};

export function extractRibeiroGenroFormAnswers(answers: Record<string, string> | null | undefined): RibeiroGenroFormAnswers {
  const a = answers ?? {};

  const cltRaw = findAnswerByKeywords(a, ["clt", "carteira assinada", "carteira de trabalho", "emprego formal", "vinculo empregaticio"]);
  const sequelaRaw = findAnswerByKeywords(a, ["sequela"]);
  const documentacaoRaw = findAnswerByKeywords(a, ["documentacao medica", "documento medico", "laudo medico", "atestado medico", "exame medico"]);
  const auxilioRaw = findAnswerByKeywords(a, ["auxilio doenca", "auxilio-doenca", "beneficio do inss", "recebeu auxilio", "afastamento pelo inss"]);

  const sequelaBool = sequelaRaw !== null ? parseBooleanPt(sequelaRaw) : null;

  return {
    cltAtivaNaEpocaDoAcidente: cltRaw !== null ? parseBooleanPt(cltRaw) : null,
    // sequela pode vir como sim/não OU como descrição livre ("fratura no braço direito"),
    // então: se não parsear como sim/não, devolve o texto cru como veio.
    sequelaPermanente: sequelaRaw === null ? null : sequelaBool !== null ? sequelaBool : sequelaRaw,
    documentacaoMedicaDisponivel: documentacaoRaw !== null ? parseBooleanPt(documentacaoRaw) : null,
    jaRecebeuAuxilioDoenca: auxilioRaw !== null ? parseBooleanPt(auxilioRaw) : null,
  };
}

// ───────────────────────── webhook de saída ─────────────────────────
// Notifica um agente de IA no n8n toda vez que um lead novo chega pelo
// formulário instantâneo do Meta Ads pra esse cliente específico. Só
// dispara se as duas env vars estiverem configuradas — enquanto não
// tiverem, não faz nada (nem loga erro, só ignora silenciosamente).
export async function sendRibeiroGenroNewLeadWebhook(lead: Lead, rawFormAnswers: Record<string, string>) {
  const targetClientId = process.env.RIBEIRO_GENRO_CLIENT_ID;
  const webhookUrl = process.env.N8N_WEBHOOK_NOVO_LEAD_RIBEIRO_GENRO;

  if (!targetClientId || !webhookUrl) return; // integração ainda não configurada
  if (lead.clientId !== targetClientId) return; // não é esse cliente

  const payload = {
    leadId: lead.id,
    nome: lead.name,
    telefone: lead.phone,
    status: lead.stage,
    origem: "whatsapp-ribeiro-genro",
    respostasFormulario: extractRibeiroGenroFormAnswers(rawFormAnswers),
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
    console.error("Falha ao enviar webhook de saída (Ribeiro & Genro):", err);
  }
}
