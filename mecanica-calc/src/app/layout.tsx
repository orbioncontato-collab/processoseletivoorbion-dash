import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${SITE.name} ${SITE.nameAccent} | ${SITE.tagline}`, template: `%s | ${SITE.name} ${SITE.nameAccent}` },
  description:
    "12 calculadoras de Engenharia Mecânica com fórmula, substituição dos valores e explicação: forças, tensão, deformação, torção, potência, gases ideais, rendimento, hidrostática, vazão, Reynolds, perda de carga e condução de calor.",
};

export const viewport: Viewport = {
  themeColor: "#142d4e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
