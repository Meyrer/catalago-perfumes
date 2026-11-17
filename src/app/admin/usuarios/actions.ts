"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { hashPassword, requireAdminAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type FormResult = { error?: string; message?: string; link?: string };
const resetDuration = 30 * 60 * 1000;
const usersPath = "/admin/usuarios";

export async function manageAdminUser(id: number | null, _previous: FormResult, form: FormData): Promise<FormResult> {
  const actor = await requireAdminAuth();
  const operation = form.get("operation");
  if (id !== null && (!Number.isInteger(id) || id < 1 || id > 2147483647)) return { error: "Usuário inválido." };

  try {
    if (operation === "save") {
      const name = String(form.get("name") ?? "").trim();
      const email = String(form.get("email") ?? "").trim();
      if (!name || name.length > 100) return { error: "Informe um nome de até 100 caracteres." };
      if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: "Informe um e-mail válido." };

      if (id === null) {
        const username = String(form.get("username") ?? "").trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,40}$/.test(username)) return { error: "O usuário deve ter de 3 a 40 caracteres, usando letras sem acento, números, ponto, hífen ou sublinhado." };
        await prisma.adminUser.create({
          data: { name, username, email: email || null, passwordHash: hashPassword(randomBytes(32).toString("hex")) },
        });
        revalidatePath(usersPath);
        return { message: "Usuário criado. Gere o link para ele definir a primeira senha." };
      }

      const previous = await prisma.adminUser.findUnique({ where: { id }, select: { email: true } });
      if (!previous) return { error: "Usuário não encontrado." };
      const saved = await prisma.adminUser.updateMany({
        where: { id, email: previous.email },
        data: {
          name, email: email || null,
          ...(previous.email !== (email || null) ? { resetTokenHash: null, resetExpiresAt: null } : {}),
        },
      });
      if (!saved.count) return { error: "O usuário foi alterado. Atualize a página e tente novamente." };
      revalidatePath(usersPath);
      return { message: "Usuário atualizado." };
    }

    if (id === null) return { error: "Usuário não encontrado." };

    if (operation === "activate" || operation === "deactivate") {
      if (actor.id === id) return { error: "Você não pode desativar a própria conta." };
      const active = operation === "activate";
      await prisma.$transaction(async tx => {
        const currentActor = await tx.adminUser.findUnique({ where: { id: actor.id }, select: { active: true } });
        if (!currentActor?.active) throw new Error("Sessão indisponível.");
        await tx.adminUser.updateMany({
          where: { id, active: !active },
          data: { active, sessionVersion: { increment: 1 }, resetTokenHash: null, resetExpiresAt: null },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      revalidatePath(usersPath);
      return { message: active ? "Acesso reativado." : "Acesso desativado." };
    }

    if (operation !== "link" && operation !== "email") return { error: "Operação inválida." };
    const target = await prisma.adminUser.findUnique({ where: { id }, select: { active: true, email: true, sessionVersion: true } });
    if (!target?.active) return { error: "Ative a conta antes de gerar um link." };
    const sending = operation === "email";
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ADMIN_MAIL_FROM;
    if (sending && (!apiKey || !from || !target.email)) return { error: "O envio exige um remetente configurado e um e-mail salvo na conta." };

    const token = randomBytes(32).toString("base64url");
    const resetTokenHash = createHash("sha256").update(token).digest("hex");
    const link = new URL("/admin/redefinir-senha", process.env.ADMIN_APP_URL || "https://perfumio.app");
    link.hash = `${id}.${token}`;
    const updated = await prisma.adminUser.updateMany({
      where: { id, active: true, email: target.email, sessionVersion: target.sessionVersion },
      data: { resetTokenHash, resetExpiresAt: new Date(Date.now() + resetDuration) },
    });
    if (!updated.count) return { error: "A conta foi alterada. Atualize a página e tente novamente." };
    if (!sending) return { link: link.href, message: "Link válido por 30 minutos e para um único uso. Compartilhe em particular com a pessoa." };

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to: [target.email], subject: "Defina sua senha do painel Perfumio",
          text: `Use este link para definir sua senha no painel Perfumio. Ele expira em 30 minutos.\n\n${link.href}\n\nSe você não esperava esta mensagem, ignore o e-mail.`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Envio indisponível.");
      return { message: "Link de redefinição enviado por e-mail." };
    } catch {
      await prisma.adminUser.updateMany({
        where: { id, resetTokenHash },
        data: { resetTokenHash: null, resetExpiresAt: null },
      });
      return { error: "O provedor não confirmou o envio. Tente novamente ou gere um link para compartilhar." };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Esse nome de usuário já está em uso." };
    return { error: "Não foi possível concluir. Atualize a página e tente novamente." };
  }
}
