import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  verifyMetaState,
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  listManagedPages,
  subscribePageToLeadgen,
  encryptToken,
} from "@/lib/meta";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");

  const state = stateParam ? verifyMetaState(stateParam) : null;
  const returnTo = state?.returnTo ?? "/crm";

  if (oauthError) {
    return NextResponse.redirect(new URL(`${returnTo}?meta_error=${encodeURIComponent(oauthError)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL(`${returnTo}?meta_error=invalid_state`, req.url));
  }

  // segurança: quem completou o login no Meta precisa ser a mesma
  // sessão/cliente que iniciou o fluxo (admin pode configurar qualquer
  // cliente; usuário CLIENT só pode configurar o próprio).
  if (session.user.role !== "ADMIN" && session.user.clientId !== state.clientId) {
    return NextResponse.redirect(new URL(`${returnTo}?meta_error=forbidden`, req.url));
  }

  try {
    const shortLived = await exchangeCodeForUserToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const pages = await listManagedPages(longLived.access_token);

    if (pages.length === 0) {
      return NextResponse.redirect(new URL(`${returnTo}?meta_error=no_pages`, req.url));
    }

    // simplicidade: conecta a primeira Página retornada. Se o cliente
    // gerencia mais de uma, ele pode desconectar e reconectar escolhendo
    // outra conta do Facebook que só administre a página certa.
    const page = pages[0];

    await subscribePageToLeadgen(page.id, page.access_token);

    await prisma.metaConnection.upsert({
      where: { clientId: state.clientId },
      update: {
        pageId: page.id,
        pageName: page.name,
        encryptedToken: encryptToken(page.access_token),
        connectedByUserId: session.user.id,
      },
      create: {
        clientId: state.clientId,
        pageId: page.id,
        pageName: page.name,
        encryptedToken: encryptToken(page.access_token),
        connectedByUserId: session.user.id,
      },
    });

    return NextResponse.redirect(new URL(`${returnTo}?meta_connected=1`, req.url));
  } catch (err) {
    console.error("meta callback error", err);
    return NextResponse.redirect(new URL(`${returnTo}?meta_error=exchange_failed`, req.url));
  }
}
