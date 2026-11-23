import { CSV_TEMPLATE } from "@/modules/integrations/csv";

/** Modelo da planilha de importação (com BOM para o Excel abrir os acentos certos). */
export function GET() {
  return new Response(`﻿${CSV_TEMPLATE}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-head-comercial.csv"',
    },
  });
}
