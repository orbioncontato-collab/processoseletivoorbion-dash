import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStages } from "@/modules/commercial/queries";
import { setSourceStatus } from "@/modules/integrations/actions";
import { PROVIDER_LABELS, ReprocessForm, RotateKeyForm, StageMapForm } from "@/modules/integrations/components/forms";
import { EVENT_LABELS, EVENT_STATUS, KIND_LABELS, SOURCE_STATUS } from "@/modules/integrations/labels";
import { WhatsappPanel } from "@/modules/integrations/components/whatsapp";

export const metadata: Metadata = { title: "Conexão" };

const UNMAPPED = /Etapa "(.+)" não está mapeada/;

export default async function SourcePage({ params }: PageProps<"/integracoes/[id]">) {
  const { company } = await requireLeader();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("integration_sources")
    .select("id, name, kind, provider, status, config, secret_hint, last_event_at, last_error, created_at, owner_user_id")
    .eq("id", id)
    .eq("company_id", company.companyId)
    .maybeSingle();
  if (!source) notFound();

  const [stages, events, failedRes] = await Promise.all([
    getStages(company.companyId),
    supabase
      .from("raw_events")
      .select("id, event_type, status, error, received_at, attempts, payload")
      .eq("source_id", id)
      .order("id", { ascending: false })
      .limit(50),
    supabase.from("raw_events").select("error").eq("source_id", id).eq("status", "failed").limit(1000),
  ]);

  const stageMap = ((source.config as Record<string, unknown>)?.stage_map ?? {}) as Record<string, string>;
  const pendingNames = new Set<string>();
  for (const e of failedRes.data ?? []) {
    const m = e.error?.match(UNMAPPED);
    if (m && !(m[1] in stageMap)) pendingNames.add(m[1]);
  }
  const mapRows = [
    ...Object.entries(stageMap).map(([external, target]) => ({ external, target })),
    ...[...pendingNames].map((external) => ({ external, target: "", pending: true })),
  ];
  const failedCount = failedRes.data?.length ?? 0;
  const hasKey = source.kind === "webhook" || source.kind === "crm";
  const isWhatsapp = source.kind === "whatsapp_device";
  const endpoint = `${publicEnv().NEXT_PUBLIC_SITE_URL}/api/webhooks/ingest/${source.id}`;
  const st = SOURCE_STATUS[source.status] ?? SOURCE_STATUS.active;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/integracoes" className="text-sm text-primary hover:underline">
          ← Integrações
        </Link>
      </div>
      <PageHeader
        title={source.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {KIND_LABELS[source.kind]} · {PROVIDER_LABELS[source.provider] ?? source.provider}
            <Badge variant={st.variant}>{st.label}</Badge>
          </span>
        }
        actions={
          hasKey ? (
            <form action={setSourceStatus}>
              <input type="hidden" name="id" value={source.id} />
              <input type="hidden" name="status" value={source.status === "paused" ? "active" : "paused"} />
              <Button type="submit" variant="outline" size="sm">
                {source.status === "paused" ? "Retomar" : "Pausar"}
              </Button>
            </form>
          ) : null
        }
      />

      {pendingNames.size ? (
        <Card className="border-warning/50">
          <CardContent className="p-4 text-sm">
            {pendingNames.size} etapa(s) do sistema de origem ainda sem correspondência no Head. Mapeie abaixo e depois
            reprocesse as falhas.
          </CardContent>
        </Card>
      ) : null}

      {isWhatsapp ? (
        <Card>
          <CardHeader>
            <CardTitle>Conexão do WhatsApp</CardTitle>
            <CardDescription>
              {source.last_error ? `Último aviso: ${source.last_error}` : "Somente leitura: o Head não envia mensagens."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WhatsappPanel sourceId={source.id} status={source.status} />
          </CardContent>
        </Card>
      ) : null}

      <div className={isWhatsapp ? "hidden" : "grid gap-6 lg:grid-cols-2"}>
        {hasKey ? (
          <Card>
            <CardHeader>
              <CardTitle>Acesso</CardTitle>
              <CardDescription>Use este endereço e a chave para enviar dados no formato padrão.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <code className="break-all font-mono text-xs">{endpoint}</code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chave</p>
                <p className="font-mono text-xs">hc_••••••••{source.secret_hint}</p>
              </div>
              <RotateKeyForm id={source.id} endpoint={endpoint} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de etapas</CardTitle>
            <CardDescription>
              Diga qual etapa do Head corresponde a cada etapa do sistema de origem. Nomes iguais aos do Head são
              reconhecidos sozinhos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StageMapForm id={source.id} rows={mapRows} stages={stages.map((s) => ({ id: s.id, name: s.name }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <CardTitle>Dados recebidos</CardTitle>
            <CardDescription>Os 50 mais recentes. {failedCount ? `${failedCount} com falha.` : ""}</CardDescription>
          </div>
          <ReprocessForm id={source.id} failed={failedCount} />
        </CardHeader>
        <CardContent className="p-0">
          {events.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.data.map((e) => {
                  const es = EVENT_STATUS[e.status] ?? EVENT_STATUS.pending;
                  const data = (e.payload as { data?: { title?: string; name?: string } })?.data;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(e.received_at, company.timezone)}</TableCell>
                      <TableCell>
                        {EVENT_LABELS[e.event_type] ?? e.event_type}
                        <p className="max-w-48 truncate text-xs text-muted-foreground">{data?.title ?? data?.name ?? ""}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={es.variant}>{es.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md text-xs text-muted-foreground">{e.error ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Nenhum dado recebido ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
