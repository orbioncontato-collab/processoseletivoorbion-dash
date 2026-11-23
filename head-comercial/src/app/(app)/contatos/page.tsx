import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCompany } from "@/lib/auth/session";
import { formatPhone } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTeam, listContacts } from "@/modules/commercial/queries";
import { SOURCE_LABELS } from "@/modules/commercial/schemas";

export const metadata: Metadata = { title: "Contatos" };

export default async function ContactsPage({ searchParams }: PageProps<"/contatos">) {
  const { company } = await requireCompany();
  const isLeader = company.role === "leader";
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const showArchived = sp.arquivados === "1";
  const [contacts, team] = await Promise.all([
    listContacts(company.companyId, q, showArchived),
    isLeader ? getTeam(company.companyId) : Promise.resolve([]),
  ]);
  const ownerName = new Map(team.map((t) => [t.userId, t.name]));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Contatos"
        description={isLeader ? "Clientes e leads do time." : "Seus clientes e leads."}
        actions={
          <Button asChild>
            <Link href="/contatos/novo">
              <Plus aria-hidden /> Novo contato
            </Link>
          </Button>
        }
      />
      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar contato
        </label>
        <Input id="q" name="q" placeholder="Buscar por nome ou telefone" defaultValue={q} className="sm:max-w-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="arquivados" value="1" defaultChecked={showArchived} /> Incluir arquivados
        </label>
        <Button type="submit" variant="secondary" size="sm">
          Buscar
        </Button>
      </form>
      <Card>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {q ? "Nenhum contato encontrado." : "Nenhum contato ainda."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Origem</TableHead>
                  {isLeader ? <TableHead>Responsável</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/contatos/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.name}
                      </Link>
                      {c.organization ? <p className="text-xs text-muted-foreground">{c.organization}</p> : null}
                      {c.archived_at ? <Badge variant="outline" className="mt-1">Arquivado</Badge> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatPhone(c.phone_e164) || "-"}</TableCell>
                    <TableCell>{SOURCE_LABELS[c.source] ?? c.source}</TableCell>
                    {isLeader ? <TableCell>{ownerName.get(c.owner_id) ?? "Ex-membro"}</TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
