import { cache } from "react";
import { prisma } from "@/lib/prisma";

// cache() dedupa chamadas idênticas dentro da mesma requisição (React Server
// Components) — evita buscar o mesmo cliente 2x quando o layout e a página
// precisam dele (ex: /crm, /dashboard). Não persiste entre requisições.
export const getClientById = cache(async (clientId: string) => {
  return prisma.client.findUnique({ where: { id: clientId } });
});
