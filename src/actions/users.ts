"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { ActionState } from "@/actions/clients";

const userSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.string().email("Email inválido."),
  password: z.string().min(10, "A senha deve ter ao menos 10 caracteres."),
});

export async function createClientUser(
  clientId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) {
    return { error: "Já existe um usuário com esse email." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase().trim(),
      passwordHash,
      role: "CLIENT",
      clientId,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  return { error: undefined };
}
