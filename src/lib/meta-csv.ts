// Reconhecimento automático de colunas de exportações do Meta Ads Manager.
// O Meta varia o conjunto/ordem de colunas conforme o relatório configurado
// (com ou sem período nas colunas, com ou sem detalhamento por dia etc.), e
// os nomes vêm em português. Em vez de exigir um cabeçalho fixo, procuramos
// por apelidos conhecidos (normalizados, sem acento) para cada campo que
// precisamos.

export type MetaField = "date" | "campaignName" | "amountSpent" | "impressions" | "clicks" | "results" | "reach" | "frequency";

const FIELD_ALIASES: Record<MetaField, string[]> = {
  date: ["inicio dos relatorios", "data de inicio", "dia", "data"],
  campaignName: ["nome da campanha"],
  amountSpent: ["valor gasto (brl)", "valor gasto", "valor usado (brl)", "valor usado"],
  impressions: ["impressoes"],
  clicks: ["cliques (todos)", "cliques no link", "cliques"],
  results: ["resultados"],
  reach: ["alcance"],
  frequency: ["frequencia"],
};

// campos que precisamos ter identificado pra conseguir importar; os demais
// (alcance, frequência) são opcionais e viram 0 se não encontrados.
const REQUIRED_FIELDS: MetaField[] = ["date", "campaignName", "amountSpent", "impressions", "clicks", "results"];

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas diacríticas combinantes)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Aceita "14.01", "14,01", "1.234,56", "1,234.56", "–" (traço do Meta p/
// "sem dado"), vazio, etc.
export function parseMetaNumber(raw: string | undefined | null): number {
  if (raw === undefined || raw === null) return 0;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "–" || trimmed === "-" || trimmed === "—") return 0;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  let normalized = trimmed;
  if (hasComma && hasDot) {
    // o último separador é o decimal; o outro é milhar
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = trimmed.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = trimmed.replace(/,/g, "");
    }
  } else if (hasComma) {
    // só vírgula: assume decimal (formato BR)
    normalized = trimmed.replace(",", ".");
  }

  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Converte "20 de ago de 2026", "2026-08-20", "20/08/2026" etc. para
// "YYYY-MM-DD". Retorna null se não conseguir reconhecer.
export function parseMetaDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // já está em YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY
  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export type MetaMappingResult = {
  headerMap: Partial<Record<MetaField, string>>; // campo -> nome da coluna original detectada
  missing: MetaField[];
};

export function detectMetaColumns(rawHeaders: string[]): MetaMappingResult {
  const normalizedHeaders = rawHeaders.map((h) => ({ original: h, normalized: normalizeKey(h) }));
  const headerMap: Partial<Record<MetaField, string>> = {};

  for (const field of Object.keys(FIELD_ALIASES) as MetaField[]) {
    const aliases = FIELD_ALIASES[field];
    const match = normalizedHeaders.find((h) => aliases.includes(h.normalized));
    if (match) headerMap[field] = match.original;
  }

  const missing = REQUIRED_FIELDS.filter((f) => !headerMap[f]);
  return { headerMap, missing };
}

export type NormalizedCampaignRow = {
  date: string;
  campaign_name: string;
  amount_spent: number;
  impressions: number;
  clicks: number;
  results: number;
  reach: number;
  frequency: number;
};

// Mapeia as linhas cruas do CSV (chaves = cabeçalho original do Meta) para o
// formato normalizado que a importação usa, e agrega linhas duplicadas
// (mesma data + mesma campanha) somando os valores — evita que uma campanha
// repetida sobrescreva a outra silenciosamente.
export function mapAndAggregateMetaRows(
  rawRows: Record<string, string>[],
  headerMap: Partial<Record<MetaField, string>>
): { rows: NormalizedCampaignRow[]; skipped: number } {
  const byKey = new Map<string, NormalizedCampaignRow>();
  let skipped = 0;

  for (const row of rawRows) {
    const dateRaw = headerMap.date ? row[headerMap.date] : undefined;
    const date = parseMetaDate(dateRaw);
    const campaignName = headerMap.campaignName ? row[headerMap.campaignName]?.trim() : undefined;

    if (!date || !campaignName) {
      skipped++;
      continue;
    }

    const entry: NormalizedCampaignRow = {
      date,
      campaign_name: campaignName,
      amount_spent: parseMetaNumber(headerMap.amountSpent ? row[headerMap.amountSpent] : undefined),
      impressions: Math.round(parseMetaNumber(headerMap.impressions ? row[headerMap.impressions] : undefined)),
      clicks: Math.round(parseMetaNumber(headerMap.clicks ? row[headerMap.clicks] : undefined)),
      results: Math.round(parseMetaNumber(headerMap.results ? row[headerMap.results] : undefined)),
      reach: Math.round(parseMetaNumber(headerMap.reach ? row[headerMap.reach] : undefined)),
      frequency: parseMetaNumber(headerMap.frequency ? row[headerMap.frequency] : undefined),
    };

    const key = `${date}__${campaignName}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.amount_spent += entry.amount_spent;
      existing.impressions += entry.impressions;
      existing.clicks += entry.clicks;
      existing.results += entry.results;
      existing.reach = Math.max(existing.reach, entry.reach);
      existing.frequency = existing.frequency || entry.frequency;
    } else {
      byKey.set(key, entry);
    }
  }

  return { rows: Array.from(byKey.values()), skipped };
}

export const META_FIELD_LABELS: Record<MetaField, string> = {
  date: "Data",
  campaignName: "Nome da campanha",
  amountSpent: "Valor gasto",
  impressions: "Impressões",
  clicks: "Cliques",
  results: "Resultados",
  reach: "Alcance",
  frequency: "Frequência",
};
