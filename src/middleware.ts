import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Observação de segurança: os headers de segurança (CSP incluída) são
// aplicados de forma estática e universal via `headers()` em
// next.config.mjs — não aqui. Testamos uma variante com CSP + nonce por
// requisição neste middleware, mas o wrapper `withAuth` do NextAuth trata a
// própria rota de login de forma especial internamente e não repassa por
// esta função para esse path específico, o que deixaria o login sem CSP.
// A abordagem estática é mais previsível e cobre 100% das rotas, inclusive
// /login — outra camada de segurança não deve depender de comportamento
// interno não documentado de uma lib de terceiros.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if ((pathname.startsWith("/dashboard") || pathname.startsWith("/crm")) && !token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/crm/:path*"],
};
