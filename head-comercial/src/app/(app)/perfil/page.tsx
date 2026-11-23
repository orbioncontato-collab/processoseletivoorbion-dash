import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NameForm, PasswordChangeForm } from "./profile-forms";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="grid gap-6">
      <PageHeader title="Meu perfil" description={user.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
            <CardDescription>Seu nome aparece para a equipe e no histórico.</CardDescription>
          </CardHeader>
          <CardContent>
            <NameForm fullName={user.fullName} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Senha</CardTitle>
            <CardDescription>Para trocar, confirme a senha atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
