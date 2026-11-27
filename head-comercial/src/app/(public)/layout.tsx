import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar px-4 py-4 sm:px-8">
        <Link href="/entrar" aria-label="Head Comercial">
          <Logo height={24} />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
