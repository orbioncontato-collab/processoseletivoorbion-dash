import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Plus } from "lucide-react";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatPhone } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeam } from "@/modules/commercial/queries";
import { setContactArchived } from "@/modules/commercial/actions";
import { StatusBadge } from "@/modules/commercial/components/badges";
import { ContactForm } from "@/modules/commercial/components/contact-forms";

export const metadata: Metadata = { title: "Contato" };

export default async function ContactPage({ params }: PageProps<"/contatos/[id]">) {
  const { company } = await requireCompany();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("company_id", company.companyId)
    .maybeSingle();
  if (!contact) notFound();

  const [{ data: opps }, team] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, title, status, value_cents")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    company.role === "leader" ? getTeam(company.companyId) : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/contatos" className="text-sm text-primary hover:underline">
          ← Contatos
        </Link>
      </div>
      <PageHeader
        title={contact.name}
        description={[contact.organization, formatPhone(contact.phone_e164)].filter(Boolean).join(" · ") || undefined}
        actions={
          <form action={setContactArchived}>
            <input type="hidden" name="id" value={contact.id} />
            <input type="hidden" name="archive" value={contact.archived_at ? "0" : "1"} />
            <Button type="submit" variant="outline" size="sm">
              {contact.archived_at ? "Reativar contato" : "Arquivar contato"}
            </Button>
          </form>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Dados do contato</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactForm
              values={{
                id: contact.id,
                name: contact.name,
                phone: formatPhone(contact.phone_e164),
                email: contact.email,
                organization: contact.organization,
                notes: contact.notes,
                ownerId: contact.owner_id,
              }}
              owners={team ? team.map((t) => ({ id: t.userId, name: t.name })) : null}
              submitLabel="Salvar contato"
            />
          </CardContent>
        </Card>
        <Card className="content-start">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Oportunidades</CardTitle>
            {!contact.archived_at ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/oportunidades/nova?contato=${contact.id}`}>
                  <Plus aria-hidden /> Nova
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {opps?.length ? (
              <ul className="grid gap-3">
                {opps.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/oportunidades/${o.id}`} className="truncate text-primary hover:underline">
                      {o.title}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-muted-foreground">{formatMoney(o.value_cents)}</span>
                      <StatusBadge status={o.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade com este contato.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
