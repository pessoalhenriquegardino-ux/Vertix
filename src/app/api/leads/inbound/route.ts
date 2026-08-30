import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyClientNewLead } from "@/lib/push";

// Endpoint genérico de recebimento de leads via webhook (Zapier, Make,
// n8n, ou qualquer automação que consiga fazer um POST). Alternativa que
// não depende de aprovação de App do Meta — cada cliente tem sua própria
// URL secreta (?token=...), então é seguro sem precisar de login.
//
// Aceita JSON com nomes de campo flexíveis (tanto em inglês quanto os
// nomes que o Zapier usa pra Facebook Lead Ads).
function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_-]+/g, " ");
}

const NAME_KEYS = ["name", "full name", "nome", "nome completo", "full_name"].map(normalizeKey);
const EMAIL_KEYS = ["email", "e mail"].map(normalizeKey);
const PHONE_KEYS = ["phone", "phone number", "telefone", "celular", "whatsapp", "phone_number"].map(normalizeKey);
const SOURCE_KEYS = ["source", "campaign name", "campaign_name", "origem", "form name", "form_name"].map(normalizeKey);
const EXTERNAL_ID_KEYS = ["id", "lead id", "leadgen_id", "external_id"].map(normalizeKey);

function pick(body: Record<string, unknown>, keys: string[]): string | undefined {
  for (const [k, v] of Object.entries(body)) {
    if (keys.includes(normalizeKey(k)) && v != null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token ausente na URL." }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { webhookToken: token } });
  if (!client) {
    return NextResponse.json({ error: "token inválido." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido, esperado JSON." }, { status: 400 });
  }

  // Zapier às vezes manda { data: {...} } ou o objeto direto — aceita os dois.
  const payload = (body?.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;

  const name = pick(payload, NAME_KEYS);
  if (!name) {
    return NextResponse.json({ error: "campo de nome não encontrado no payload." }, { status: 400 });
  }

  const email = pick(payload, EMAIL_KEYS);
  const phone = pick(payload, PHONE_KEYS);
  const source = pick(payload, SOURCE_KEYS);
  const externalId = pick(payload, EXTERNAL_ID_KEYS);

  // outros campos viram anotação, igual ao import de CSV
  const knownKeys = new Set([...NAME_KEYS, ...EMAIL_KEYS, ...PHONE_KEYS, ...SOURCE_KEYS, ...EXTERNAL_ID_KEYS]);
  const notesLines = Object.entries(payload)
    .filter(([k, v]) => !knownKeys.has(normalizeKey(k)) && v != null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);

  const data = {
    clientId: client.id,
    name,
    email: email || undefined,
    phone: phone || undefined,
    source: source ? `Automação · ${source}` : "Automação (Zapier/Make/n8n)",
    stage: "NEW" as const,
    notes: notesLines.length > 0 ? notesLines.join("\n") : undefined,
    createdByUserId: "system",
  };

  let created = true;

  if (externalId) {
    const existing = await prisma.lead.findUnique({
      where: { clientId_externalId: { clientId: client.id, externalId } },
      select: { id: true },
    });
    created = !existing;
    await prisma.lead.upsert({
      where: { clientId_externalId: { clientId: client.id, externalId } },
      update: { name: data.name, email: data.email, phone: data.phone, notes: data.notes },
      create: { ...data, externalId },
    });
  } else {
    await prisma.lead.create({ data });
  }

  if (created) {
    await notifyClientNewLead(client.id, name, source);
  }

  return NextResponse.json({ ok: true });
}
