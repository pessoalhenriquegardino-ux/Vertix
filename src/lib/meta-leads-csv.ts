// Reconhecimento automático de exports de formulário do Meta Lead Ads
// (Instagram/Facebook Ads → "Baixar leads"). Esse export tem colunas fixas
// (id, created_time, campanha, formulário, plataforma...) + colunas
// dinâmicas com as perguntas do formulário, que variam por anúncio/cliente.

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, " ");
}

// Colunas "conhecidas" de um export do Meta Lead Ads — tudo que não estiver
// aqui (nem for nome/email/telefone) é tratado como pergunta do formulário.
const KNOWN_META_COLUMNS = new Set(
  [
    "id",
    "created_time",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "form_id",
    "form_name",
    "is_organic",
    "platform",
    "lead_status",
  ].map(normalizeKey)
);

const NAME_ALIASES = ["nome completo", "nome", "full name", "name"].map(normalizeKey);
const EMAIL_ALIASES = ["email", "e mail"].map(normalizeKey);
const PHONE_ALIASES = ["telefone", "phone number", "phone", "celular", "whatsapp"].map(normalizeKey);

export type MetaLeadsDetection = {
  isMetaLeadsFormat: boolean;
  idCol?: string;
  createdTimeCol?: string;
  nameCol?: string;
  emailCol?: string;
  phoneCol?: string;
  campaignNameCol?: string;
  formNameCol?: string;
  platformCol?: string;
  questionCols: string[]; // colunas restantes = perguntas do formulário
};

export function detectMetaLeadsFormat(rawHeaders: string[]): MetaLeadsDetection {
  const withNorm = rawHeaders.map((h) => ({ original: h, normalized: normalizeKey(h) }));
  const find = (aliases: string[]) => withNorm.find((h) => aliases.includes(h.normalized))?.original;

  const createdTimeCol = find(["created time"]);
  const idCol = find(["id"]);
  const formNameCol = find(["form name"]);
  const adNameCol = find(["ad name"]);

  // sinal forte de que é um export do Meta Lead Ads: tem created_time +
  // (form_id/form_name ou ad_id/ad_name)
  const isMetaLeadsFormat = !!createdTimeCol && !!(formNameCol || adNameCol);

  const nameCol = find(NAME_ALIASES);
  const emailCol = find(EMAIL_ALIASES);
  const phoneCol = find(PHONE_ALIASES);
  const campaignNameCol = find(["campaign name"]);
  const platformCol = find(["platform"]);

  const questionCols = withNorm
    .filter(
      (h) =>
        !KNOWN_META_COLUMNS.has(h.normalized) &&
        h.original !== nameCol &&
        h.original !== emailCol &&
        h.original !== phoneCol
    )
    .map((h) => h.original);

  return {
    isMetaLeadsFormat,
    idCol,
    createdTimeCol,
    nameCol,
    emailCol,
    phoneCol,
    campaignNameCol,
    formNameCol,
    platformCol,
    questionCols,
  };
}

function humanizeQuestion(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

const PLATFORM_LABELS: Record<string, string> = {
  ig: "Instagram",
  fb: "Facebook",
  facebook: "Facebook",
  instagram: "Instagram",
  audience_network: "Audience Network",
  messenger: "Messenger",
};

export type NormalizedMetaLead = {
  externalId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  createdAt: string | null; // ISO
  notes: string;
};

export function mapMetaLeadsRows(rawRows: Record<string, string>[], detection: MetaLeadsDetection): NormalizedMetaLead[] {
  return rawRows
    .map((row): NormalizedMetaLead | null => {
      const name = detection.nameCol ? row[detection.nameCol]?.trim() : "";
      if (!name) return null;

      const platformRaw = detection.platformCol ? row[detection.platformCol]?.trim().toLowerCase() : undefined;
      const platformLabel = platformRaw ? PLATFORM_LABELS[platformRaw] ?? platformRaw : undefined;
      const campaignName = detection.campaignNameCol ? row[detection.campaignNameCol]?.trim() : undefined;

      const source = ["Meta Ads", platformLabel, campaignName].filter(Boolean).join(" · ") || "Meta Ads";

      const createdRaw = detection.createdTimeCol ? row[detection.createdTimeCol] : undefined;
      const createdDate = createdRaw ? new Date(createdRaw) : null;
      const createdAt = createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.toISOString() : null;

      const notesLines: string[] = [];
      if (detection.formNameCol && row[detection.formNameCol]) {
        notesLines.push(`Formulário: ${row[detection.formNameCol]}`);
      }
      if (platformLabel) notesLines.push(`Origem: ${platformLabel}`);
      if (notesLines.length > 0) notesLines.push("");

      for (const q of detection.questionCols) {
        const answer = row[q]?.trim();
        if (answer) notesLines.push(`${humanizeQuestion(q)}: ${answer}`);
      }

      return {
        externalId: detection.idCol ? row[detection.idCol]?.trim() || null : null,
        name,
        email: detection.emailCol ? row[detection.emailCol]?.trim() || null : null,
        phone: detection.phoneCol ? row[detection.phoneCol]?.trim() || null : null,
        source,
        createdAt,
        notes: notesLines.join("\n").trim() || null,
      } as NormalizedMetaLead;
    })
    .filter((r): r is NormalizedMetaLead => r !== null);
}
