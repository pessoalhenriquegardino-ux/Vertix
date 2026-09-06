// Modelo padrão usado quando o cliente ainda não configurou o próprio.
// {nome} e {primeiro_nome} são substituídos pelo nome real do lead.
export const DEFAULT_WHATSAPP_TEMPLATE =
  "Olá {primeiro_nome}! Tudo bem? Vi que você se interessou pelos nossos serviços. Posso te ajudar com alguma informação? 😊";

export function fillWhatsappTemplate(template: string, leadName: string): string {
  const trimmedName = leadName.trim();
  const firstName = trimmedName.split(/\s+/)[0] || trimmedName;
  return template.replaceAll("{primeiro_nome}", firstName).replaceAll("{nome}", trimmedName);
}

// Normaliza telefone pra só dígitos, com DDI — aceita qualquer formatação
// de entrada (parênteses, traço, espaço, +55...) e assume Brasil (55)
// quando o número não tem código de país. Usado tanto pro link do
// WhatsApp quanto pra guardar o telefone de forma consistente no banco
// (ex: API de leads externos), evitando duplicar o mesmo lead por causa
// de formatação diferente do telefone.
export function normalizePhoneDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("0")) normalized = normalized.slice(1); // 0 de discagem local

  // número brasileiro sem DDI (10 dígitos = DDD + fixo, 11 = DDD + 9 + celular)
  if (!normalized.startsWith("55") && (normalized.length === 10 || normalized.length === 11)) {
    normalized = "55" + normalized;
  }

  if (normalized.length < 10) return null; // curto demais pra ser um número válido

  return normalized;
}

// Monta o link do WhatsApp (wa.me) já com a mensagem pronta.
export function buildWhatsAppLink(phone: string, message: string): string | null {
  const normalized = normalizePhoneDigits(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
