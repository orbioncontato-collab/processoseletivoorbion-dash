import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { METRICS, type MetricKey } from "@/modules/reports/rules";

export interface DivergenceView {
  id: string;
  reference_date: string;
  metric_key: string;
  declared: number;
  captured: number;
  status: string;
  justification: string | null;
  questionLabel: string;
  questionKind: string;
  stageName?: string | null;
  personName?: string;
}

export const DIVERGENCE_STATUS: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
  open: { label: "Para conferir", variant: "warning" },
  justified: { label: "Explicada", variant: "default" },
  verified: { label: "Verificada", variant: "success" },
};

/** Frase neutra: mostra o informado e o capturado, sem acusar. */
export function DivergenceSummary({ d }: { d: DivergenceView }) {
  const fmt = (n: number) => (d.questionKind === "currency" ? formatMoney(n) : String(n));
  const source = `${METRICS[d.metric_key as MetricKey] ?? d.metric_key}${d.stageName ? ` "${d.stageName}"` : ""}`;
  const st = DIVERGENCE_STATUS[d.status] ?? DIVERGENCE_STATUS.open;
  return (
    <div className="grid gap-1">
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {d.questionLabel}
        <Badge variant={st.variant}>{st.label}</Badge>
      </p>
      <p className="text-sm">
        Informado: <strong>{fmt(Number(d.declared))}</strong> · Capturado: <strong>{fmt(Number(d.captured))}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        {d.personName ? `${d.personName} · ` : ""}
        {formatDate(d.reference_date)} · Comparado com: {source}. Pode haver atividade fora dos canais conectados.
      </p>
      {d.justification ? <p className="text-sm text-muted-foreground">Explicação: {d.justification}</p> : null}
    </div>
  );
}
