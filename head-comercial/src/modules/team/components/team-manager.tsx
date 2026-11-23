import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revokeInvitation, setMemberStatus } from "@/modules/team/actions";
import { ROLE_LABELS, remainingSeats } from "@/modules/team/schemas";
import { InviteForm } from "./invite-form";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

/** Lista a equipe, os convites pendentes e permite convidar. Usado por líder e admin. */
export async function TeamManager({
  companyId,
  currentUserId,
}: {
  companyId: string;
  currentUserId: string;
}) {
  const supabase = await createClient();
  const [companyRes, membersRes, invitesRes] = await Promise.all([
    supabase.from("companies").select("max_users").eq("id", companyId).maybeSingle(),
    supabase
      .from("memberships")
      .select("id, user_id, role, status, created_at")
      .eq("company_id", companyId)
      .order("created_at"),
    supabase
      .from("invitations")
      .select("id, email, full_name, role, created_at")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (companyRes.error || membersRes.error || invitesRes.error || !companyRes.data) {
    throw new Error("Não foi possível carregar a equipe.");
  }

  const members = membersRes.data ?? [];
  const invites = invitesRes.data ?? [];
  const { data: profiles } = members.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", members.map((m) => m.user_id))
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const activeCount = members.filter((m) => m.status === "active").length;
  const seats = remainingSeats(companyRes.data.max_users, activeCount, invites.length);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>
            {activeCount} ativo(s) de {companyRes.data.max_users} vagas.
            {invites.length ? ` ${invites.length} convite(s) aguardando.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ninguém na equipe ainda. Envie o primeiro convite abaixo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const p = profileById.get(m.user_id);
                  const isSelf = m.user_id === currentUserId;
                  const active = m.status === "active";
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">
                          {p?.full_name || "Sem nome"}
                          {isSelf ? <span className="ml-1 text-xs text-muted-foreground">(você)</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{p?.email}</div>
                      </TableCell>
                      <TableCell>{ROLE_LABELS[m.role]}</TableCell>
                      <TableCell>
                        <Badge variant={active ? "success" : "outline"}>{active ? "Ativo" : "Desativado"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isSelf ? null : (
                          <form action={setMemberStatus}>
                            <input type="hidden" name="membershipId" value={m.id} />
                            <input type="hidden" name="status" value={active ? "disabled" : "active"} />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              disabled={!active && seats === 0}
                              title={!active && seats === 0 ? "Sem vagas disponíveis" : undefined}
                            >
                              {active ? "Desativar" : "Reativar"}
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invites.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Convites aguardando</CardTitle>
            <CardDescription>A pessoa entra na equipe quando cria a senha pelo link do e-mail.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-medium">{inv.full_name || inv.email}</div>
                      <div className="text-xs text-muted-foreground">{inv.email}</div>
                    </TableCell>
                    <TableCell>{ROLE_LABELS[inv.role]}</TableCell>
                    <TableCell>{dateFmt.format(new Date(inv.created_at))}</TableCell>
                    <TableCell className="text-right">
                      <form action={revokeInvitation}>
                        <input type="hidden" name="invitationId" value={inv.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                          Cancelar
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Convidar pessoa</CardTitle>
          <CardDescription>
            {seats > 0
              ? `A pessoa recebe um e-mail para criar a senha. Vagas livres: ${seats}.`
              : "Sem vagas livres. Desative alguém ou peça mais vagas à Orbion."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm companyId={companyId} disabled={seats === 0} />
        </CardContent>
      </Card>
    </div>
  );
}
