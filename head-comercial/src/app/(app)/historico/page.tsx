import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import type { ActivityRow } from "@/modules/activities/format";
import { buildFormatContext } from "@/modules/activities/context";
import { Timeline } from "@/modules/activities/timeline";

export const metadata: Metadata = { title: "Histórico" };

export default async function HistoryPage() {
  const { company } = await requireLeader();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select("id, actor_type, actor_id, action, entity_type, entity_id, changes, occurred_at")
    .eq("company_id", company.companyId)
    .order("occurred_at", { ascending: false })
    .limit(150);
  if (error) throw new Error("Não foi possível carregar o histórico.");
  const rows = (data ?? []) as ActivityRow[];
  const ctx = await buildFormatContext(company.companyId, rows);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Histórico"
        description="Tudo que mudou na empresa, com quem fez e quando. Os registros não podem ser alterados."
      />
      <Card>
        <CardContent className="p-0">
          <Timeline rows={rows} ctx={ctx} timeZone={company.timezone} />
        </CardContent>
      </Card>
    </div>
  );
}
