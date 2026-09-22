import crypto from "crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

const COOKIE_NAME = "elegance_admin_session";
const SESSION_DURATION_DAYS = 7;

function getSecretKey(): string {
  return process.env.ADMIN_SESSION_SECRET || "elegance-luxury-perfume-admin-session-secret-2026";
}

export type AdminSessionUser = {
  id: number;
  username: string;
  name: string;
  mustChangePassword: boolean;
};

/**
 * Cria hash seguro de senha utilizando scrypt com salt aleatório
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Valida a senha comparando com o hash e salt armazenados
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuf = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Gera assinatura HMAC-SHA256 para o payload base64url
 */
function createSignature(payload: string): string {
  const hmac = crypto.createHmac("sha256", getSecretKey());
  hmac.update(payload);
  return hmac.digest("hex");
}

/**
 * Cria token assinado de sessão para o usuário
 */
function createSessionToken(userId: number): string {
  const expiresAt = Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ userId, expiresAt });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = createSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Obtém a sessão do administrador ativo a partir do cookie assinado
 */
export async function getAdminSession(): Promise<AdminSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const parts = sessionCookie.value.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, receivedSig] = parts;
    const expectedSig = createSignature(encodedPayload);

    const receivedBuf = Buffer.from(receivedSig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");

    if (receivedBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(receivedBuf, expectedBuf)) return null;

    const rawPayload = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const { userId, expiresAt } = JSON.parse(rawPayload);

    if (typeof expiresAt !== "number" || Date.now() > expiresAt) {
      return null;
    }

    // Busca usuário atualizado no banco de dados
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        mustChangePassword: true,
      },
    });

    if (!user) return null;

    return user;
  } catch {
    return null;
  }
}

/**
 * Verifica se a requisição atual possui sessão de admin ativa
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await getAdminSession();
  return Boolean(session);
}

/**
 * Realiza autenticação no banco de dados e define cookie seguro
 */
export async function loginAdmin(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; user?: AdminSessionUser }> {
  const username = (usernameInput || "").trim().toLowerCase();
  const password = (passwordInput || "").trim();

  if (!username || !password) {
    return { success: false, error: "Informe o usuário e a senha." };
  }

  // Busca o usuário no PostgreSQL
  const user = await prisma.adminUser.findUnique({
    where: { username },
  });

  if (!user) {
    return { success: false, error: "Usuário ou senha incorretos." };
  }

  // Valida a senha usando scrypt
  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Usuário ou senha incorretos." };
  }

  // Gera o token de sessão assinado
  const token = createSessionToken(user.id);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });

  const sessionUser: AdminSessionUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
  };

  return { success: true, user: sessionUser };
}

/**
 * Altera a senha do usuário autenticado e remove a exigência de primeiro acesso
 */
export async function changeAdminPassword(
  newPasswordInput: string,
  confirmPasswordInput: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const newPassword = (newPasswordInput || "").trim();
  const confirmPassword = (confirmPasswordInput || "").trim();

  if (newPassword.length < 6) {
    return { success: false, error: "A nova senha deve conter pelo menos 6 caracteres." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "A confirmação da senha não confere com a nova senha." };
  }

  // Impede reutilizar a senha provisória padrão
  const lowerNew = newPassword.toLowerCase();
  if (lowerNew === "meyrer123" || lowerNew === "felipe123" || lowerNew === "admin123") {
    return { success: false, error: "Defina uma senha pessoal diferente da senha temporária inicial." };
  }

  const newHash = hashPassword(newPassword);

  await prisma.adminUser.update({
    where: { id: session.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  return { success: true };
}

/**
 * Encerra a sessão administrativa removendo o cookie httpOnly
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Barreira de segurança para Server Actions administrativas
 */
export async function requireAdminAuth(allowPendingPasswordChange = false): Promise<AdminSessionUser> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Não autorizado: Faça login no painel administrativo para realizar esta ação.");
  }

  if (session.mustChangePassword && !allowPendingPasswordChange) {
    throw new Error("Ação bloqueada: É necessário alterar sua senha provisória antes de acessar o catálogo.");
  }

  return session;
}
