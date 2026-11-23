import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md gap-4 px-4 py-16 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-2xl font-semibold">Não encontramos esta página</h1>
      <p className="text-sm text-muted-foreground">
        O endereço pode estar errado, o registro pode ter sido removido ou você não tem acesso a ele.
      </p>
      <div>
        <Button asChild variant="outline">
          <Link href="/inicio">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
