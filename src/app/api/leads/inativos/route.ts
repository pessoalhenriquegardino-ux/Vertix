import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest } from "@/lib/api-auth";

// Leads "mornos": ainda não fecharam (WON) nem foram descartados (LOST),
// e não têm interação há mais de X horas. Alimenta uma automação de
// follow-up (ex: workflow do n8n rodando em intervalo) que dispara
// reengajamento pra quem parou de responder.
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { client } = auth;

  const horasParam = req.nextUrl.searchParams.get("horas");
  const horas = horasParam ? Number(horasParam) : 24;
  if (!Number.isFinite(horas) || horas <= 0) {
    return NextResponse.json({ error: "Parâmetro 'horas' inválido — informe um número positivo." }, { status: 400 });
  }

  const limite = new Date(Date.now() - horas * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      clientId: client.id,
      stage: { notIn: ["WON", "LOST"] },
      lastInteractionAt: { lt: limite },
    },
    orderBy: { lastInteractionAt: "asc" },
  });

  return NextResponse.json({
    horas,
    total: leads.length,
    leads: leads.map((lead) => ({
      id: lead.id,
      nome: lead.name,
      telefone: lead.phone,
      email: lead.email,
      origem: lead.source,
      status: lead.stage,
      ultimaInteracaoEm: lead.lastInteractionAt,
      criadoEm: lead.createdAt,
    })),
  });
}
