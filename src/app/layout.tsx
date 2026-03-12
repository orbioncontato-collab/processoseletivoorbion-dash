import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orbion | Dashboard Processo Seletivo',
  description: 'Painel de acompanhamento do funil de recrutamento',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased" style={{ background: '#0A1123' }}>
        {children}
      </body>
    </html>
  );
}
