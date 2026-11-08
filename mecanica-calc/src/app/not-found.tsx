import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-muted">O endereço não existe ou a calculadora mudou de lugar.</p>
      <Link href="/" className="btn btn-primary mt-5">
        Ver todas as calculadoras
      </Link>
    </div>
  );
}
