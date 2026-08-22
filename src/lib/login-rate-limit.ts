import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS_PER_EMAIL = 8;
const MAX_ATTEMPTS_PER_IP = 25;

// Retorna true se o login deve ser bloqueado por excesso de tentativas
// recentes (falhas) para este email OU este IP — mitigação de credential
// stuffing / brute force. Não distingue "email não existe" de "senha
// errada" na contagem, então também amortece enumeração de usuários.
export async function checkLoginRateLimit(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);

  return emailFailures >= MAX_ATTEMPTS_PER_EMAIL || ipFailures >= MAX_ATTEMPTS_PER_IP;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ip, success } });

  // Limpeza oportunista de registros antigos (>24h), sem precisar de job
  // agendado — roda ocasionalmente para não pesar em toda tentativa.
  if (Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
  }
}
