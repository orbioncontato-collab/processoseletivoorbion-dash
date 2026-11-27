import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Erros do sistema" };

export default async function ErrorsPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_errors")
    .select("id, occurred_at, source, path, method, message, digest, stack")
    .order("occurred_at", { ascending: false })
    .limit(100);
  const errors = data ?? [];
  return (
    <div className="grid gap-6">
      <PageHeader title="Erros do sistema" description="Os últimos 100 erros do servidor. Mensagens técnicas, para a equipe de desenvolvimento." />
      <Card>
        <CardContent className="p-4">
          {errors.length ? (
            <ul className="grid gap-3" aria-label="Erros registrados">
              {errors.map((e) => (
                <li key={e.id} className="rounded-lg border p-3 text-sm">
                  <details>
                    <summary className="cursor-pointer">
                      <span className="font-medium">{e.message}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDateTime(e.occurred_at, "America/Sao_Paulo")} · {e.source}
                        {e.path ? ` · ${e.method ?? ""} ${e.path}` : ""}
                        {e.digest ? ` · ${e.digest}` : ""}
                      </span>
                    </summary>
                    {e.stack ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{e.stack}</pre> : null}
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum erro registrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
