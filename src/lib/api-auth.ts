import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Autentica requisições de automações externas (n8n, etc.) pela API Key
// própria de cada cliente — nada de sessão/login aqui. Aceita tanto
// "Authorization: Bearer <api_key>" (padrão REST) quanto "x-api-key"
// (mais simples de configurar em algumas ferramentas de automação).
export async function authenticateApiRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const bearerKey = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : undefined;
  const apiKey = bearerKey || req.headers.get("x-api-key")?.trim();

  if (!apiKey) {
    return { error: "API Key ausente. Envie em 'Authorization: Bearer <api_key>' ou 'x-api-key'.", status: 401 } as const;
  }

  const client = await prisma.client.findUnique({ where: { apiKey } });
  if (!client) {
    return { error: "API Key inválida.", status: 401 } as const;
  }

  return { client } as const;
}
