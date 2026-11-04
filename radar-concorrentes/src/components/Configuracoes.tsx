"use client";

import { useState, useTransition } from "react";
import { importarBackup, salvarConfig } from "@/app/actions";

export function AlternarExemplos({ ligado }: { ligado: boolean }) {
  const [valor, setValor] = useState(ligado);
  const [pendente, iniciar] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={valor}
        disabled={pendente}
        onChange={(e) => {
          setValor(e.target.checked);
          iniciar(async () => void (await salvarConfig(e.target.checked)));
        }}
        className="h-4 w-4 accent-emerald-600"
      />
      <span className="text-sm">Mostrar os 2 perfis de exemplo (fictícios) nas telas</span>
    </label>
  );
}

export function ImportarBackup() {
  const [msg, setMsg] = useState("");
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="file"
        accept="application/json"
        disabled={pendente}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (!arquivo || !confirm("Isso substitui todos os dados atuais pelos do arquivo. Continuar?")) return;
          iniciar(async () => {
            const r = await importarBackup(await arquivo.text());
            setMsg(r.ok ? (r.msg ?? "Importado.") : r.erro);
          });
        }}
        className="text-sm"
      />
      {msg && <span className="text-sm text-suave">{msg}</span>}
    </div>
  );
}
