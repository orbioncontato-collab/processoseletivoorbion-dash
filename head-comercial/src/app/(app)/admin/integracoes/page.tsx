import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { canEncrypt } from "@/lib/secrets";
import { secretSource, type SecretName } from "@/lib/platform-config";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { removeSecret } from "@/modules/platform/actions";
import { SecretForm, TestAnthropicButton } from "@/modules/platform/components/secret-forms";

export const metadata: Metadata = { title: "Integrações da plataforma" };

interface Row {
  hint: string | null;
  updated_at: string;
}

function Status({ name, source, row }: { name: SecretName; source: "screen" | "env" | null; row?: Row }) {
  if (source === "screen" && row) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="success">Configurada</Badge>
        <span className="text-muted-foreground">
          {name === "evolution_api_url" ? row.hint : `termina em ${row.hint}`} · salva em {formatDateTime(row.updated_at, "America/Sao_Paulo")}
        </span>
        <form action={removeSecret}>
          <input type="hidden" name="name" value={name} />
          <Button type="submit" variant="ghost" size="sm">
            Remover
          </Button>
        </form>
      </div>
    );
  }
  if (source === "env") return <Badge variant="outline">Configurada pela variável do servidor</Badge>;
  return <Badge variant="warning">Não configurada</Badge>;
}

export default async function PlatformIntegrationsPage() {
  await requirePlatformAdmin();
  const db = createServiceClient({ type: "system" });
  const { data } = await db.from("platform_secrets").select("name, hint, updated_at");
  const rows = new Map((data ?? []).map((r) => [r.name as SecretName, r]));
  const [ai, evoUrl, evoKey] = await Promise.all([
    secretSource("anthropic_api_key"),
    secretSource("evolution_api_url"),
    secretSource("evolution_api_key"),
  ]);
  const writable = canEncrypt();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Integrações da plataforma"
        description="Chaves usadas por todas as empresas. Ficam guardadas cifradas e nunca aparecem inteiras na tela."
      />
      {!writable ? (
        <Alert variant="destructive">
          O servidor ainda não tem a chave de cifra (SECRETS_ENCRYPTION_KEY). Sem ela não dá para salvar chaves por aqui. O
          passo a passo está no guia de configuração.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>IA (Anthropic)</CardTitle>
          <CardDescription>
            Liga o chat com o Head, a análise de conversas e o resumo do dia. A chave é criada no Console da Anthropic e
            começa com sk-ant-.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Status name="anthropic_api_key" source={ai} row={rows.get("anthropic_api_key")} />
          <SecretForm name="anthropic_api_key" label="Chave da API" placeholder="sk-ant-..." disabled={!writable} />
          {ai ? <TestAnthropicButton /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp por QR Code (Evolution API)</CardTitle>
          <CardDescription>
            Servidor que mantém a conexão dos celulares dos vendedores. Precisa do endereço e da chave definida na
            instalação do servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3">
            <Status name="evolution_api_url" source={evoUrl} row={rows.get("evolution_api_url")} />
            <SecretForm name="evolution_api_url" label="Endereço do servidor" type="url" placeholder="https://whatsapp.suaempresa.com" disabled={!writable} />
          </div>
          <div className="grid gap-3">
            <Status name="evolution_api_key" source={evoKey} row={rows.get("evolution_api_key")} />
            <SecretForm name="evolution_api_key" label="Chave do servidor" disabled={!writable} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
