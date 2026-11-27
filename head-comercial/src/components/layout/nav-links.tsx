"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Bell, Bot, BookOpen, Brain, FileText, Gauge, GraduationCap, ListTodo, Building2, ClipboardCheck, ClipboardList, Contact, Handshake, History, Lightbulb, Home, Kanban, MessagesSquare, Plug, Settings, Smartphone, UserCircle, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "users" | "history" | "building" | "user" | "deals" | "contacts" | "pipeline" | "plug" | "chat" | "phone" | "report" | "reports" | "bell" | "settings" | "book" | "brain" | "memory" | "bot" | "training" | "docs" | "actions" | "gauge" | "errors";
}

const ICONS: Record<NavItem["icon"], LucideIcon> = {
  home: Home,
  users: Users,
  history: History,
  building: Building2,
  user: UserCircle,
  deals: Handshake,
  contacts: Contact,
  pipeline: Kanban,
  plug: Plug,
  chat: MessagesSquare,
  phone: Smartphone,
  report: ClipboardCheck,
  reports: ClipboardList,
  bell: Bell,
  settings: Settings,
  book: BookOpen,
  brain: Brain,
  memory: Lightbulb,
  bot: Bot,
  training: GraduationCap,
  docs: FileText,
  actions: ListTodo,
  gauge: Gauge,
  errors: AlertTriangle,
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Menu principal">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-active font-medium text-sidebar-active-foreground"
                : "hover:bg-sidebar-active/60 hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
