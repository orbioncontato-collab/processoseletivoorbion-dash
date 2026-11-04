import { lerDB } from "@/lib/db";

/** Baixa todos os dados da plataforma em um arquivo JSON. */
export async function GET() {
  const db = await lerDB();
  const data = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(db, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="radar-backup-${data}.json"`,
    },
  });
}
