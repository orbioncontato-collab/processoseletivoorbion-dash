import { LogOut } from "lucide-react";
import { getActiveCompany, requireUser } from "@/lib/auth/session";
import { signOut } from "@/modules/auth/actions";
import { setActiveCompany } from "@/modules/companies/actions";
import { ROLE_LABELS } from "@/modules/team/schemas";
import { Logo } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";

export async function Sidebar() {
  const user = await requireUser();
  const company = await getActiveCompany(user);

  const items: NavItem[] = [];
  if (company) {
    items.push({ href: "/inicio", label: "Início", icon: "home" });
    items.push({ href: "/assistente", label: "Head Comercial", icon: "bot" });
    items.push({ href: "/alertas", label: "Alertas", icon: "bell" });
    items.push({ href: "/oportunidades", label: "Oportunidades", icon: "deals" });
    items.push({ href: "/contatos", label: "Contatos", icon: "contacts" });
    items.push({ href: "/conversas", label: "Conversas", icon: "chat" });
    items.push({ href: "/relatorio", label: "Relatório", icon: "report" });
    items.push({ href: "/meu-whatsapp", label: "Meu WhatsApp", icon: "phone" });
    items.push({ href: "/conhecimento", label: "Conhecimento", icon: "book" });
    items.push({ href: "/memoria", label: "Memória", icon: "memory" });
    if (company.role === "leader") {
      items.push({ href: "/relatorios", label: "Relatórios do time", icon: "reports" });
      items.push({ href: "/equipe", label: "Equipe", icon: "users" });
      items.push({ href: "/funil", label: "Funil", icon: "pipeline" });
      items.push({ href: "/integracoes", label: "Integrações", icon: "plug" });
      items.push({ href: "/configuracoes", label: "Configurações", icon: "settings" });
      items.push({ href: "/historico", label: "Histórico", icon: "history" });
    }
  }
  if (user.isPlatformAdmin) {
    items.push({ href: "/admin/empresas", label: "Empresas", icon: "building" });
    items.push({ href: "/admin/cerebro", label: "Cérebro central", icon: "brain" });
    items.push({ href: "/admin/consumo", label: "Consumo da IA", icon: "reports" });
    items.push({ href: "/admin/integracoes", label: "Chaves e integrações", icon: "plug" });
  }
  items.push({ href: "/perfil", label: "Meu perfil", icon: "user" });

  return (
    <div className="flex h-full flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between gap-3">
        <Logo height={24} className="self-start" />
        <form action={signOut} className="lg:hidden">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs hover:text-white"
          >
            <LogOut className="size-4" aria-hidden />
            Sair
          </button>
        </form>
      </div>

      {company ? (
        <div className="rounded-lg bg-sidebar-active/70 px-3 py-2.5">
          {user.memberships.length > 1 ? (
            <form action={setActiveCompany} className="grid gap-1.5">
              <label htmlFor="empresa" className="text-[11px] uppercase tracking-wide text-sidebar-foreground/70">
                Empresa
              </label>
              <div className="flex gap-2">
                <select
                  id="empresa"
                  name="companyId"
                  defaultValue={company.companyId}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-sidebar px-2 py-1 text-sm text-white"
                >
                  {user.memberships.map((m) => (
                    <option key={m.companyId} value={m.companyId}>
                      {m.companyName}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded-md bg-white/10 px-2 text-xs text-white hover:bg-white/20">
                  Trocar
                </button>
              </div>
            </form>
          ) : (
            <p className="truncate text-sm font-medium text-white">{company.companyName}</p>
          )}
          <p className="mt-1 text-xs text-brand-green">{ROLE_LABELS[company.role]}</p>
        </div>
      ) : null}

      <NavLinks items={items} />

      <div className="mt-auto hidden border-t border-white/10 pt-4 lg:block">
        <p className="truncate text-sm text-white">{user.fullName || user.email}</p>
        <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p>
        <form action={signOut} className="mt-3">
          <button type="submit" className="flex items-center gap-2 text-sm hover:text-white">
            <LogOut className="size-4" aria-hidden />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="h-6 w-28 rounded bg-white/10" />
      <div className="h-14 rounded-lg bg-white/5" />
      <div className="grid gap-2">
        <div className="h-8 rounded bg-white/5" />
        <div className="h-8 rounded bg-white/5" />
      </div>
    </div>
  );
}
