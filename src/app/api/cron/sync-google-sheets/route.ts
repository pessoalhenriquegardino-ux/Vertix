import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncLeadsFromGoogleSheet } from "@/lib/google-sheets-sync";

// Chamado com frequência (idealmente a cada 5 min, via cron externo grátis
// tipo cron-job.org — o Vercel Cron do plano grátis só dispara 1x/dia).
// Cada cliente tem seu próprio "syncIntervalMinutes" configurável no CRM —
// essa rota roda sempre, mas só sincroniza de verdade quem já "venceu" o
// próprio intervalo. É assim que o menu de 5min/20min/1h/1dia funciona sem
// precisar reconfigurar nada externo quando alguém troca o intervalo.
// Protegido por um token secreto — sem ele, ninguém de fora dispara isso.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const connections = await prisma.googleSheetConnection.findMany({
    select: { clientId: true, lastSyncAt: true, syncIntervalMinutes: true },
  });

  const now = Date.now();
  const due = connections.filter(({ lastSyncAt, syncIntervalMinutes }) => {
    if (!lastSyncAt) return true;
    const elapsedMinutes = (now - lastSyncAt.getTime()) / 60000;
    return elapsedMinutes >= syncIntervalMinutes;
  });

  const results = await Promise.all(
    due.map(async ({ clientId }) => {
      const result = await syncLeadsFromGoogleSheet(clientId);
      return { clientId, ...result };
    })
  );

  return NextResponse.json({ checked: connections.length, synced: results.length, results });
}
