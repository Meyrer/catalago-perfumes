import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { apiError, apiSuccess, isAdminApiAuthorized } from "@/lib/admin-api";

export const runtime = "nodejs";
const maxFileSize = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isAdminApiAuthorized(request)) return apiError("Não autorizado.", process.env.API_ADMIN_KEY ? 401 : 503);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > maxFileSize + 64 * 1024) return apiError("A imagem deve ter no máximo 10 MB.", 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return apiError("Envie multipart/form-data com o campo file.", 400);
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return apiError("Envie uma imagem no campo file.", 400);
    if (file.size > maxFileSize) return apiError("A imagem deve ter no máximo 10 MB.", 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg"
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
    const mime = extension === "jpg" ? "image/jpeg" : extension ? `image/${extension}` : null;
    if (!extension || file.type !== mime) return apiError("Formato inválido. Envie JPEG, PNG ou WebP com conteúdo e MIME correspondentes.", 400);
    const filename = `api-${randomUUID()}.${extension}`;
    const directory = join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), bytes, { flag: "wx" });
    const path = `/uploads/${filename}`;
    return apiSuccess({ path, url: new URL(`/api/uploads/${filename}`, request.url).toString(), contentType: mime, size: bytes.length }, 201);
  } catch { return apiError("Não foi possível receber ou salvar a imagem.", 400); }
}
