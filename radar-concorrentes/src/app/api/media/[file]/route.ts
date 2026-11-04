import { promises as fs } from "fs";
import path from "path";
import { PASTA_MEDIA } from "@/lib/db";

/** Entrega as imagens salvas em data/media (capas dos posts e fotos de perfil). */
export async function GET(_: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const nome = path.basename(file);
  try {
    const buf = await fs.readFile(path.join(PASTA_MEDIA, nome));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800" },
    });
  } catch {
    return new Response("não encontrado", { status: 404 });
  }
}
