import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ filename: string }> };

// Fotos de catálogo são públicas; somente arquivos gerados pelo upload autenticado são servidos aqui.
export async function GET(_request: Request, context: Context) {
  const { filename } = await context.params;
  if (!/^api-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(filename)) return new Response("Não encontrado.", { status: 404 });
  try {
    const bytes = await readFile(join(process.cwd(), "public", "uploads", filename));
    const extension = filename.split(".").at(-1);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": extension === "jpg" ? "image/jpeg" : `image/${extension}`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return new Response("Imagem indisponível.", { status: (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500 });
  }
}
