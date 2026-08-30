import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMetaWebhookSignature, decryptToken, fetchLeadgenData, mapLeadgenFieldData } from "@/lib/meta";

// Handshake de verificação que o Meta faz uma vez, ao configurar o webhook.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Evento real: um novo lead preencheu um formulário instantâneo numa Página
// conectada. O payload do Meta só traz o ID do lead — buscamos os dados
// completos na Graph API com o token da Página.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyMetaWebhookSignature(raw, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  const entries = Array.isArray(body?.entry) ? body.entry : [];

  for (const entry of entries) {
    const pageId = entry.id as string | undefined;
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id as string | undefined;
      if (!pageId || !leadgenId) continue;

      // não bloqueia a resposta ao Meta por causa de um erro num lead —
      // registra e segue pros próximos.
      await processLeadgenEvent(pageId, leadgenId).catch((err) => {
        console.error("Falha ao processar lead do webhook Meta:", err);
      });
    }
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

async function processLeadgenEvent(pageId: string, leadgenId: string) {
  const connection = await prisma.metaConnection.findUnique({ where: { pageId } });
  if (!connection) return; // página não conectada a nenhum cliente nosso

  const pageAccessToken = decryptToken(connection.encryptedToken);
  const leadgen = await fetchLeadgenData(leadgenId, pageAccessToken);
  const { name, email, phone, questionLines } = mapLeadgenFieldData(leadgen.field_data ?? []);

  if (!name) return; // sem nome, não dá pra criar um lead útil

  const notes = questionLines.length > 0 ? questionLines.join("\n") : undefined;
  const createdAt = leadgen.created_time ? new Date(leadgen.created_time) : undefined;

  await prisma.lead.upsert({
    where: { clientId_externalId: { clientId: connection.clientId, externalId: leadgenId } },
    update: { name, email: email ?? undefined, phone: phone ?? undefined, notes },
    create: {
      clientId: connection.clientId,
      externalId: leadgenId,
      name,
      email: email ?? undefined,
      phone: phone ?? undefined,
      source: `Meta Ads · ${connection.pageName}`,
      stage: "NEW",
      notes,
      createdByUserId: connection.connectedByUserId,
      ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { createdAt } : {}),
    },
  });
}
