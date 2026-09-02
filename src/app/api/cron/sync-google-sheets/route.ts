import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncLeadsFromGoogleSheet } from "@/lib/google-sheets-sync";

// Chamado pelo Vercel Cron (1x/dia, grátis) ou por um cron externo (ex:
// cron-job.org, grátis) pra sincronizar com mais frequência. Protegido por
// um token secreto — sem ele, ninguém de fora consegue disparar isso.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const connections = await prisma.googleSheetConnection.findMany({ select: { clientId: true } });

  const results = await Promise.all(
    connections.map(async ({ clientId }) => {
      const result = await syncLeadsFromGoogleSheet(clientId);
      return { clientId, ...result };
    })
  );

  return NextResponse.json({ synced: results.length, results });
}
