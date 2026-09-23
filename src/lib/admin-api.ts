import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data: plainPrismaData(data) }, { status });
}

export function plainPrismaData<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== "object") return value;
  const candidate = value as { constructor?: { name?: string }; toNumber?: () => number };
  if (candidate.constructor?.name === "Decimal" && typeof candidate.toNumber === "function") {
    return candidate.toNumber() as T;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => plainPrismaData(item)) as T;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainPrismaData(item)])) as T;
}

export function isAdminApiAuthorized(request: Request): boolean {
  const configuredKey = process.env.API_ADMIN_KEY;
  if (!configuredKey || configuredKey.length < 32) return false;

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const expected = createHash("sha256").update(configuredKey).digest();
  const provided = createHash("sha256").update(match[1]).digest();
  return timingSafeEqual(expected, provided);
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function positiveId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function optionalText(value: unknown, field: string, maxLength = 5000): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} deve ser texto.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${field} excede ${maxLength} caracteres.`);
  return trimmed || null;
}

export function requiredText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} é obrigatório.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${field} excede ${maxLength} caracteres.`);
  return trimmed;
}

export function optionalNumber(value: unknown, field: string, options: { integer?: boolean; min?: number } = {}): number | undefined {
  if (value === undefined) return undefined;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || (options.integer && !Number.isInteger(number)) || (options.min !== undefined && number < options.min)) {
    throw new Error(`${field} deve ser um número válido${options.min !== undefined ? ` maior ou igual a ${options.min}` : ""}.`);
  }
  return number;
}

export function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`${field} deve ser booleano.`);
  return value;
}

export function optionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length > 200)) {
    throw new Error(`${field} deve ser uma lista de textos.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}
