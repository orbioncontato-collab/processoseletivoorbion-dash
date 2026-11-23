import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-cols-[1fr_1.1fr] lg:grid-rows-1">
      <aside className="flex flex-col justify-between bg-sidebar px-6 py-6 text-sidebar-foreground lg:px-12 lg:py-12">
        <Logo height={30} className="self-start" />
        <div className="hidden max-w-md lg:block">
          <p className="text-3xl font-semibold leading-tight text-white">
            O líder comercial que acompanha cada movimento da sua operação.
          </p>
          <p className="mt-4 text-base text-sidebar-foreground">
            Veja o que merece atenção, saiba o que fazer agora e acompanhe a evolução do time.
          </p>
        </div>
        <p className="hidden text-xs text-sidebar-foreground/70 lg:block">Head Comercial · Orbion</p>
      </aside>
      <main className="flex items-start justify-center px-4 py-10 sm:px-8 lg:items-center">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
