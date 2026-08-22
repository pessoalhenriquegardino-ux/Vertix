import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Autoriza ADMIN (para qualquer cliente) ou CLIENT logado exatamente no
// clientId em questão. Usado nas ações do CRM, que tanto a agência quanto o
// cliente final podem operar.
export async function requireClientAccess(clientId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Não autenticado.");

  if (session.user.role === "ADMIN") return session;
  if (session.user.role === "CLIENT" && session.user.clientId === clientId) return session;

  throw new Error("Não autorizado.");
}
