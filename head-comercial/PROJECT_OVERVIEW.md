# Head Comercial Digital: visão do produto

## O que estamos construindo

Um sistema que acompanha a operação comercial de uma empresa como um gerente comercial experiente faria. Ele recebe os dados da operação (conversas de WhatsApp, oportunidades, relatórios dos vendedores), cruza tudo, mostra o que merece atenção, orienta vendedor e líder sobre o que fazer, recomenda treinamentos e guarda memória de tudo que aconteceu.

Pense num líder comercial que nunca dorme: ele lê o movimento do dia, percebe que uma negociação está parada há 6 dias, vê que o vendedor disse ter feito 10 contatos quando o WhatsApp mostra 6, nota que a mesma pessoa sempre perde vendas na fase de qualificação e indica um treinamento sobre isso. Depois ele continua olhando para ver se melhorou.

## Problema que resolve

1. O gestor comercial não consegue acompanhar tudo. Ele só descobre o problema quando sabe o que perguntar.
2. O vendedor esquece de registrar informações, e o CRM fica desatualizado.
3. O que o vendedor declara e o que realmente aconteceu nem sempre batem, e ninguém percebe.
4. O conhecimento comercial da empresa (metodologia, scripts, objeções) fica espalhado e não chega ao vendedor na hora certa.
5. O desenvolvimento do time acontece por intuição, sem dado.

## Quem usa

| Perfil | Quem é | O que faz no sistema |
|---|---|---|
| Administrador da plataforma | Equipe Orbion | Cria empresas e usuários, configura relatórios de cada empresa, alimenta o cérebro central, configura agentes, acompanha uso e custo de IA. |
| Líder | Gestor comercial da empresa cliente | Acompanha o time, vê divergências e alertas, conversa com os agentes, também pode vender e ter as próprias oportunidades. |
| Vendedor | Membro do time comercial | Vê as próprias prioridades, oportunidades, próximos passos, preenche o relatório, recebe recomendações e treinamentos. |

Estrutura inicial por empresa: 1 líder e até 5 vendedores. O modelo de dados aceita mais pessoas e mais líderes sem mudança de estrutura.

## Fluxo de uso no dia a dia

1. O vendedor conversa com clientes pelo WhatsApp. O sistema captura as conversas automaticamente.
2. Uma conversa relevante vira oportunidade, com valor, etapa e próximo passo.
3. No horário configurado, o vendedor preenche o relatório da empresa (ex.: contatos feitos, propostas enviadas, dificuldades).
4. O sistema cruza o relatório com o que capturou e aponta diferenças.
5. Os alertas aparecem no painel: próximo passo vencido, negociação parada, relatório não preenchido.
6. O vendedor abre o painel e vê "o que fazer agora". O líder abre o painel e vê "quem e o que merece atenção".
7. Qualquer um pode conversar com os agentes (Head Comercial, Analista de Conversas etc.). Cada resposta mostra qual agente está falando.
8. O Head identifica padrões, recomenda treinamento, registra a recomendação e acompanha a evolução nas próximas conversas.

## Princípio de decisão

Toda funcionalidade precisa contribuir para isto: conhecer a operação, acompanhar o que acontece, mostrar o que merece atenção, orientar o que fazer, ensinar como executar e aprender com o resultado. O que não ajuda nisso fica para depois.

## Funcionalidades que não estavam no documento e que eu incluí

| Item | Motivo |
|---|---|
| Convite de usuários por e-mail e redefinição de senha | Sem isso o administrador teria que criar senhas para os outros, o que é inseguro. |
| Etapas do funil configuráveis por empresa | Cada empresa vende de um jeito. Etapas fixas quebrariam o produto no primeiro cliente convidado. |
| Status da divergência (aberta, verificada, justificada) | Permite que o vendedor explique a diferença e que o líder marque como resolvida. Sem isso a divergência vira acusação. |
| Registro de uso e custo de IA por empresa | Para saber quanto cada cliente custa antes de definir preço. |
| Feedback nas respostas dos agentes (útil / não útil) | Alimenta a calibragem e mostra onde a IA erra. |
| Normalização de telefone | Para ligar a conversa do WhatsApp ao contato certo, mesmo com formatos diferentes (com e sem 9, com e sem +55). |
| Aviso de privacidade e política de retenção de dados | O sistema guarda conversas de clientes finais. A LGPD exige transparência e regra de quanto tempo guardar. |
| Modo "ver como vendedor" para o administrador | Ajuda o suporte e os testes sem precisar da senha de ninguém. Fica registrado no histórico. |

## Monetização (para depois do MVP)

Não haverá cobrança no MVP. A proposta para o futuro:

- Assinatura mensal por empresa, com preço por usuário (assento).
- Planos separados pelo volume de análises de IA incluídas, porque esse é o principal custo variável.
- Implantação paga (configuração de relatório, carga de documentos, calibragem), que combina com o serviço que a Orbion já presta.

O registro de custo de IA por empresa, que entra no MVP, vai dar os números para definir esses preços.
