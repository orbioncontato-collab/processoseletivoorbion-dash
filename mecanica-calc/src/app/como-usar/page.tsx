import type { Metadata } from "next";
import { Info } from "lucide-react";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Como usar e avisos" };

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-[19px] font-bold">{titulo}</h2>
      <div className="mt-3 text-[16px] leading-relaxed">{children}</div>
    </section>
  );
}

const UNIDADES = [
  ["1 kN = 1000 N", "As calculadoras de tensão e deformação abrem em kN."],
  ["1 GPa = 1000 MPa", "Módulos E e G abrem em GPa."],
  ["1 MPa = 1 N/mm²", "Força em N dividida por área em mm² já dá MPa."],
  ["1 m = 1000 mm", "Diâmetros e espessuras abrem em mm."],
  ["1 m³ = 1000 L", "1 m³/s = 1000 L/s = 3600 m³/h."],
  ["1 bar = 100 kPa", "Pressão atmosférica padrão: 101,325 kPa."],
  ["K = °C + 273,15", "Diferenças de temperatura em °C e em K são iguais."],
  ["1 RPM = 2π/60 rad/s", "A potência usa a rotação em rad/s."],
  ["1 cP = 0,001 Pa·s", "A água a 20 °C tem cerca de 1 cP."],
];

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="flex items-center gap-2 text-[28px] font-bold">
          <Info size={26} aria-hidden="true" /> Como usar e avisos
        </h1>
        <p className="mt-1 text-muted">Tudo o que você precisa para usar o {SITE.name} {SITE.nameAccent}.</p>
      </header>

      <Bloco titulo="Passo a passo">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Escolha a calculadora pela busca, pelas áreas ou pelo menu lateral.</li>
          <li>Preencha os campos e escolha a unidade de cada um. Para ver um caso pronto, toque em <strong>Carregar exemplo</strong>.</li>
          <li>Toque em <strong>Calcular</strong>. Depois disso, o resultado se atualiza sozinho quando você muda um valor.</li>
          <li>Confira a <strong>memória de cálculo</strong>: fórmula, substituição e resultado de cada etapa.</li>
          <li>Copie o resultado, copie a resolução completa ou imprima e salve em PDF.</li>
        </ol>
      </Bloco>

      <Bloco titulo="Como digitar números">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Use vírgula para decimais: <code className="mono">0,5</code> ou <code className="mono">2,25</code>. O ponto também funciona quando não há dúvida, como <code className="mono">0.5</code>.</li>
          <li>Milhar com ponto só é aceito junto com a vírgula ou em grupos de três: <code className="mono">1.234,5</code> ou <code className="mono">1.000.000</code>.</li>
          <li>Um valor como <code className="mono">1.500</code> é ambíguo (mil e quinhentos ou um e meio). A calculadora pede para você escrever <code className="mono">1500</code> ou <code className="mono">1,5</code>.</li>
          <li>Notação científica é aceita: <code className="mono">4,7e-6</code> significa 4,7 × 10⁻⁶.</li>
        </ul>
      </Bloco>

      <Bloco titulo="Unidades">
        <p>Você não precisa converter nada antes: escolha a unidade ao lado de cada campo e a calculadora faz a conversão. Para conferir de cabeça:</p>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {UNIDADES.map(([a, b]) => (
            <div key={a} className="rounded-xl border border-line bg-surface-2 p-3">
              <dt className="mono font-bold text-navy">{a}</dt>
              <dd className="text-sm text-muted">{b}</dd>
            </div>
          ))}
        </dl>
      </Bloco>

      <Bloco titulo="Precisão">
        Escolha 2, 4 ou 6 casas decimais no topo da tela. O arredondamento acontece só na exibição: as contas usam o valor completo. Números muito pequenos ou muito grandes aparecem em notação científica para não virarem zero.
      </Bloco>

      <Bloco titulo="Privacidade">
        Não há cadastro, login nem envio de dados. Todos os cálculos acontecem no seu aparelho. O histórico e as favoritas ficam guardados só neste navegador.
      </Bloco>

      <section className="rounded-[14px] border border-amber-200 bg-warn-50 p-5 sm:p-6">
        <h2 className="text-[19px] font-bold text-warn">Aviso importante</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-[#7c3d07]">
          Este material foi desenvolvido para apoio didático e conferência de exercícios acadêmicos. Os cálculos usam modelos simplificados e hipóteses específicas, descritas em cada ferramenta. Não substitui projetos de engenharia, normas técnicas, avaliações profissionais ou verificações de segurança.
        </p>
      </section>

      <p className="text-sm text-muted">Versão {SITE.version}</p>
    </div>
  );
}
