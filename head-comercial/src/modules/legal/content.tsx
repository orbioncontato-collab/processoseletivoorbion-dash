import type { ReactNode } from "react";

/**
 * Textos dos termos de uso e do aviso de privacidade.
 * VERSÃO PRELIMINAR: precisa de revisão jurídica antes dos clientes convidados (D024).
 * Ao mudar o texto, atualize CURRENT_TERMS_VERSION em src/lib/auth/session.ts.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export const TERMS_DRAFT_NOTICE = "Versão preliminar, em revisão jurídica.";

export function TermsContent() {
  return (
    <div className="grid gap-6">
      <Section title="1. O que é o Head Comercial">
        <p>
          O Head Comercial é um sistema da Orbion que acompanha a operação comercial de uma empresa: negociações, conversas
          de venda, relatórios, alertas e desenvolvimento da equipe, com apoio de agentes de inteligência artificial.
        </p>
      </Section>
      <Section title="2. Quem usa">
        <p>
          O acesso é feito por convite. A empresa cliente decide quem entra na equipe e com qual papel (líder ou vendedor).
          Cada pessoa é responsável pela própria senha e pelo que faz com o seu acesso.
        </p>
      </Section>
      <Section title="3. Uso correto">
        <p>É proibido usar o sistema para enviar mensagens em massa, coletar dados de quem não é cliente ou contato da empresa, ou tentar acessar dados de outra empresa.</p>
        <p>As análises e sugestões dos agentes de IA são apoio à decisão. A decisão final é sempre de uma pessoa da equipe.</p>
      </Section>
      <Section title="4. WhatsApp">
        <p>
          A conexão por QR Code funciona como um aparelho conectado e é somente leitura: o sistema não envia mensagens. Essa
          forma de conexão não é oficial do WhatsApp e pode levar ao bloqueio do número. Quem conecta aceita esse risco, e o
          aceite fica registrado.
        </p>
      </Section>
      <Section title="5. Dados da empresa cliente">
        <p>
          Os dados que a empresa cadastra ou conecta (contatos, negociações, conversas, documentos) pertencem a ela. A Orbion
          usa esses dados só para prestar o serviço, conforme o Aviso de privacidade.
        </p>
      </Section>
      <Section title="6. Disponibilidade e mudanças">
        <p>
          A Orbion trabalha para manter o sistema disponível e seguro, mas pode haver interrupções para manutenção. Estes
          termos podem mudar; quando isso acontecer, o novo texto será mostrado para aceite antes de continuar o uso.
        </p>
      </Section>
      <Section title="7. Contato">
        <p>Dúvidas sobre estes termos: fale com a equipe da Orbion pelo canal de atendimento informado na contratação.</p>
      </Section>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="grid gap-6">
      <Section title="1. Papéis">
        <p>
          A empresa cliente é a controladora dos dados dos seus clientes e contatos. A Orbion trata esses dados como operadora,
          seguindo as instruções da empresa cliente e a Lei Geral de Proteção de Dados (LGPD).
        </p>
      </Section>
      <Section title="2. Quais dados tratamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Dados de conta: nome, e-mail e papel na equipe.</li>
          <li>Dados comerciais cadastrados ou importados: contatos, negociações, relatórios, documentos e planos de ação.</li>
          <li>Mensagens das conversas do WhatsApp dos números que a empresa conectou. Grupos ficam de fora.</li>
          <li>Registros de uso e de segurança: acessos, ações no sistema e erros técnicos.</li>
        </ul>
      </Section>
      <Section title="3. Para que usamos">
        <p>
          Para mostrar a operação comercial, calcular números e alertas, cruzar relatórios com o que foi capturado, gerar
          análises e recomendações e manter o sistema seguro. Não vendemos dados nem usamos os dados de uma empresa para atender outra.
        </p>
      </Section>
      <Section title="4. Inteligência artificial">
        <p>
          Quando alguém usa os agentes ou pede uma análise, o trecho necessário dos dados é enviado à Anthropic, que fornece o
          modelo de IA, só para gerar a resposta. Cada chamada fica registrada no sistema.
        </p>
      </Section>
      <Section title="5. Onde os dados ficam">
        <p>
          Os dados ficam em provedores de nuvem contratados pela Orbion (banco de dados e hospedagem), com acesso separado por
          empresa e controles de permissão por papel. Chaves de integração ficam cifradas.
        </p>
      </Section>
      <Section title="6. Por quanto tempo">
        <p>
          Enquanto o contrato estiver ativo. Ao fim do contrato, os dados são devolvidos ou apagados conforme combinado com a
          empresa cliente, salvo o que a lei obrigar a guardar.
        </p>
      </Section>
      <Section title="7. Seus direitos">
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados pessoais. Pedidos sobre dados de clientes e contatos devem
          ser feitos à empresa cliente, que é a controladora.
        </p>
      </Section>
    </div>
  );
}
