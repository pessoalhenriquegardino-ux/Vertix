import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/login-rate-limit";

// Hash "dummy" usado só para manter o tempo de resposta constante quando o
// email não existe (evita enumeração de usuários por timing attack — sem
// isso, um email inexistente responde bem mais rápido que um existente,
// porque pula o bcrypt.compare).
const DUMMY_HASH = "$2a$10$YbWJEiFWrOC5z7yXnt/z3ulhcRatN91YQEgg0TUOBZ.woBiCY3ja2";

const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

export const authOptions: AuthOptions = {
  debug: false,
  // Cookies explícitos (defesa em profundidade — o NextAuth já aplica boa
  // parte disso por padrão, mas deixamos explícito e auditável): HttpOnly
  // (JS do navegador não lê o cookie), SameSite=Lax (mitiga CSRF em
  // requisições cross-site simples, sem quebrar o redirect do login) e
  // Secure em produção (só trafega por HTTPS).
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: { sameSite: "lax", path: "/", secure: useSecureCookies },
    },
    csrfToken: {
      // csrf token precisa ser legível por JS (é enviado de volta no form),
      // por isso não é HttpOnly — é o comportamento padrão do NextAuth.
      name: `${useSecureCookies ? "__Host-" : ""}next-auth.csrf-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
    },
  },
  session: {
    strategy: "jwt",
    // sessão expira em 12h de inatividade e é renovada a cada acesso; evita
    // sessões de longa duração (default do NextAuth é 30 dias) num CRM que
    // lida com dados de clientes.
    maxAge: 12 * 60 * 60,
    updateAge: 60 * 60,
  },
  jwt: {
    maxAge: 12 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const ip =
          (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
          "unknown";

        // Rate limit por email+IP: protege contra credential stuffing / brute force.
        const limited = await checkLoginRateLimit(email, ip);
        if (limited) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, email: true, passwordHash: true, role: true, clientId: true },
        });

        const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? DUMMY_HASH);

        await recordLoginAttempt(email, ip, !!user && valid);

        if (!user || !valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.clientId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.clientId = (user as any).clientId ?? null;
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).clientId = (token.clientId as string | null) ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
