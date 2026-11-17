"use server";

import { createHash } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";

const invalidLink = "Este link é inválido, expirou ou já foi usado. Peça um novo link.";

export async function redeemAdminPasswordLink(code: string, passwordInput: string, confirmationInput: string) {
  if (typeof code !== "string" || code.length > 54) return { error: invalidLink };
  if (typeof passwordInput !== "string" || typeof confirmationInput !== "string") {
    return { error: "Informe e confirme a nova senha." };
  }
  const match = /^([1-9][0-9]{0,9})\.([a-zA-Z0-9_-]{43})$/.exec(code);
  if (!match || Number(match[1]) > 2147483647) return { error: invalidLink };
  const password = passwordInput.trim();
  if (password.length < 12 || password.length > 128) return { error: "Use de 12 a 128 caracteres na nova senha." };
  if (password !== confirmationInput.trim()) return { error: "A confirmação de senha não confere." };

  const where = { id: Number(match[1]), active: true, resetTokenHash: createHash("sha256").update(match[2]).digest("hex") };
  const valid = await prisma.adminUser.findFirst({
    where: { ...where, resetExpiresAt: { gt: new Date() } }, select: { id: true },
  });
  if (!valid) return { error: invalidLink };

  const passwordHash = hashPassword(password);
  const updated = await prisma.adminUser.updateMany({
    where: { ...where, resetExpiresAt: { gt: new Date() } },
    data: {
      passwordHash, mustChangePassword: false, resetTokenHash: null, resetExpiresAt: null,
      sessionVersion: { increment: 1 },
    },
  });

  return updated.count ? { success: true } : { error: invalidLink };
}
