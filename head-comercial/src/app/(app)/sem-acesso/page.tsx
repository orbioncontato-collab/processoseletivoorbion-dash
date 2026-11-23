import type { Metadata } from "next";
import { signOut } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sem acesso" };

export default function NoAccessPage() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Você ainda não faz parte de nenhuma equipe</CardTitle>
        <CardDescription>
          Seu acesso pode ter sido desativado ou o convite ainda não foi concluído. Fale com o líder
          da sua empresa para receber um novo convite.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
