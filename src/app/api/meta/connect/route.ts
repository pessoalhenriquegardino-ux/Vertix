import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildMetaAuthUrl, signMetaState } from "@/lib/meta";

// Inicia o fluxo "Conectar com Meta". Cliente final chama sem parâmetros
// (usa o próprio clientId da sessão); admin chama com ?clientId=... pra
// configurar em nome do cliente.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const requestedClientId = url.searchParams.get("clientId");

  let clientId: string;
  let returnTo: string;

  if (session.user.role === "ADMIN") {
    if (!requestedClientId) {
      return NextResponse.json({ error: "clientId obrigatório para admin." }, { status: 400 });
    }
    clientId = requestedClientId;
    returnTo = `/admin/clients/${clientId}/crm`;
  } else {
    if (!session.user.clientId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    clientId = session.user.clientId;
    returnTo = "/crm";
  }

  if (!process.env.META_APP_ID) {
    return NextResponse.redirect(new URL(`${returnTo}?meta_error=not_configured`, req.url));
  }

  const state = signMetaState(clientId, returnTo);
  return NextResponse.redirect(buildMetaAuthUrl(state));
}
