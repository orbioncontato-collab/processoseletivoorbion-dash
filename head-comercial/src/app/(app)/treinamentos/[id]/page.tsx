import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser, getActiveCompany } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentList } from "@/modules/training/components/views";
import { getTraining, listAssignments } from "@/modules/training/queries";
import { FORMAT_LABELS, SKILLS } from "@/modules/training/skills";

export const metadata: Metadata = { title: "Treinamento" };

export default async function TrainingPage({ params }: PageProps<"/treinamentos/[id]">) {
  const user = await requireUser();
  const company = await getActiveCompany(user);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const t = await getTraining(id);
  if (!t || t.archived_at) notFound();
  const mine = company ? (await listAssignments(company.companyId, { userId: user.id })).filter((a) => a.training_id === id) : [];

  return (
    <div className="grid gap-6">
      <div>
        <Link href={company ? "/treinamentos" : "/admin/treinamentos"} className="text-sm text-primary hover:underline">
          ← Treinamentos
        </Link>
      </div>
      <PageHeader
        title={t.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{SKILLS[t.skill as keyof typeof SKILLS] ?? t.skill}</Badge>
            <Badge variant="outline">{FORMAT_LABELS[t.format] ?? t.format}</Badge>
            {t.duration_minutes ? <Badge variant="outline">{t.duration_minutes} min</Badge> : null}
            {t.scope === "global" ? <Badge>Orbion</Badge> : null}
          </span>
        }
      />
      {mine.length && company ? (
        <AssignmentList items={mine} currentUserId={user.id} isLeader={company.role === "leader"} tz={company.timezone} empty="" />
      ) : null}
      <Card>
        <CardContent className="grid gap-4 p-5">
          {t.summary ? <p className="text-sm font-medium">{t.summary}</p> : null}
          {t.url ? (
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              Abrir o material
            </a>
          ) : null}
          {t.content ? <div className="whitespace-pre-wrap text-sm leading-relaxed">{t.content}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
