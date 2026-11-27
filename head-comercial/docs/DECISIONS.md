# Decisões técnicas

Cada decisão tem data, motivo e se pode ser revista.

## D001 · 2026-11-23 · Stack principal
Next.js com TypeScript, Supabase (Postgres, Auth, RLS, pgvector, Storage), Tailwind com shadcn/ui, Zod, Vercel.
**Motivo:** a equipe já usa Next.js; Supabase entrega login, isolamento por empresa e busca vetorial prontos, o que reduz infraestrutura genérica.
**Pode rever?** Hospedagem sim, banco e login com custo alto.

## D002 · 2026-11-23 · Isolamento por empresa no banco
`company_id` em toda tabela de negócio e políticas RLS no Postgres, com testes automáticos que tentam ler dados de outra empresa.
**Motivo:** proteger os dados mesmo que exista erro na tela ou na API.

## D003 · 2026-11-23 · Histórico central único
Uma tabela `activities` para todos os módulos, com tipo de autor (usuário, integração, automação, agente).
**Motivo:** memória, auditoria e confiança nos dados a partir de um lugar só.

## D004 · 2026-11-23 · Integrações como fontes de dados
Todo evento externo entra bruto em `raw_events` e passa por um tradutor. Nenhum módulo depende diretamente de uma ferramenta externa.
**Motivo:** trocar ou somar fontes (WhatsApp, webhook, CRM) sem mexer no resto.

## D005 · 2026-11-23 · Agentes com laço próprio na API da Anthropic
API de mensagens com ferramentas executadas no nosso servidor, com as permissões do usuário logado. Modelo padrão `claude-opus-5-5`, com fallback automático em caso de recusa.
**Motivo:** isolamento entre empresas igual ao resto do sistema, respostas rápidas no chat, custo só de tokens. Managed Agents fica como opção para tarefas longas.

## D006 · 2026-11-23 · Análise profunda só quando escolhida
Captura de todas as mensagens, análise com IA só de conversas selecionadas ou marcadas por regra.
**Motivo:** custo e foco, como pede o documento do produto.

## D007 · 2026-11-23 · Projeto separado do dashboard de recrutamento
O Head Comercial será um aplicativo novo. O dashboard de processo seletivo atual continua intacto.
**Motivo:** produtos diferentes, com usuários e dados diferentes.
**Decidido pelo proprietário em 2026-11-23:** repositório novo no GitHub, criado pelo proprietário.

## D008 · 2026-11-23 · WhatsApp com dois modos de conexão (revisada)
A equipe da Orbion usa WhatsApp no celular e no WhatsApp Web, junto com o GHL, sem API. Outras empresas podem já usar a API oficial. Por isso cada número pode ser conectado de um destes jeitos:

1. **Modo API oficial:** para quem já usa ou quer usar a Cloud API da Meta. O sistema recebe as mensagens pelo webhook oficial.
2. **Modo aparelho (QR Code):** para quem usa o WhatsApp normal no celular e no Web. O vendedor lê um QR Code e o sistema vira mais um "aparelho conectado", igual ao WhatsApp Web. O vendedor continua usando celular e Web do mesmo jeito. Usaremos a Evolution API (código aberto) hospedada por nós.

**Regras do modo aparelho no MVP:**
- O sistema só lê. Nenhuma mensagem sai do sistema por esse modo. Isso reduz bastante o risco de bloqueio.
- É uma conexão não oficial. Vai contra os termos do WhatsApp e existe risco de o número ser bloqueado. A tela de conexão mostra esse aviso e registra quem aceitou e quando.
- Grupos ficam fora da captura no MVP. Só conversas individuais.

**Motivo:** atender a operação da Orbion como ela funciona hoje e deixar o caminho oficial pronto para quem já usa API.
**Consequências:** o modo aparelho precisa de um servidor pequeno ligado o tempo todo (a Vercel não roda esse tipo de serviço). Custo estimado entre 5 e 20 dólares por mês. Vai precisar da autorização do proprietário na Fase 2.
**Substitui:** a versão anterior desta decisão, que previa apenas a API oficial em coexistência. A coexistência continua possível dentro do modo API oficial, para quem usa o app WhatsApp Business.

## D009 · 2026-11-23 · Oportunidades próprias e conexão com qualquer CRM (revisada)
O Head Comercial tem o próprio cadastro de contatos e oportunidades e funciona completo sem CRM nenhum. Quem usa um CRM (GHL, RD Station, Pipedrive, HubSpot, Kommo, Agendor, Salesforce ou qualquer outro) pode conectá-lo. Nenhum CRM é tratado como especial.

**Como a conexão funciona, para qualquer CRM:**
1. **Formato padrão do Head.** Existe um formato único para contato, oportunidade, etapa e mudança de etapa. Todo CRM é traduzido para esse formato. O resto do sistema só conhece o formato padrão.
2. **Mapeamento por empresa.** Numa tela de configuração, a empresa diz qual etapa do CRM dela corresponde a qual etapa do Head e qual campo corresponde a qual campo (ex.: "Proposta enviada" no CRM dela vira a etapa "Proposta" no Head).
3. **Três jeitos de os dados chegarem, do mais simples ao mais completo:**
   - **Webhook e API do Head:** qualquer CRM que dispara webhook, ou ferramentas como Make, Zapier e n8n, envia os dados no formato padrão. Funciona com praticamente qualquer CRM desde o primeiro dia, sem programação nossa para cada um.
   - **Importação por planilha (CSV):** para começar com o histórico ou para CRMs sem webhook.
   - **Conectores nativos:** para os CRMs mais usados pelos clientes, um conector pronto que só pede a chave de acesso. Construídos aos poucos, conforme a demanda.

**Quem manda em cada dado:** quando um CRM está conectado, os campos que vêm dele ficam marcados com a origem e são atualizados por lá, para ninguém preencher duas vezes. Campos que só o Head tem (objeções, análises, próximos passos sugeridos) são editados no Head.

**Primeiro conector nativo:** o da operação piloto. Hoje é o GHL, porque é o que a Orbion usa. Ele serve como primeiro exemplo do padrão e não recebe nenhum tratamento especial no código.

**Motivo:** o produto precisa servir qualquer empresa, use ela um CRM ou não.

## D010 · 2026-11-23 · Next.js 16 com Cache Components ligado
O Next.js 16.4 já vem com Cache Components e Partial Prefetching. A documentação avisa que eles serão obrigatórios na próxima versão principal. Mantivemos ligados desde o início e seguimos o padrão: tudo que depende do usuário logado fica dentro de um `<Suspense>` no layout, e o cliente do Supabase lê os cookies antes de qualquer outra coisa.
**Motivo:** evitar uma migração forçada depois.

## D011 · 2026-11-23 · Componentes visuais próprios no padrão shadcn/ui
O site do shadcn/ui está bloqueado na rede do ambiente de desenvolvimento. Escrevemos os componentes (botão, campo, cartão, tabela, aviso, etiqueta) no mesmo padrão, com Radix, `class-variance-authority` e `tailwind-merge`. Cores da marca Orbion em tokens CSS no `globals.css`.
**Pode rever?** Sim. Componentes do shadcn podem ser adicionados depois sem conflito, porque os nomes dos tokens são os mesmos.

## D012 · 2026-11-23 · Testes de banco em Postgres comum + imitação do Supabase
As imagens Docker do Supabase não baixam no ambiente de desenvolvimento (bloqueio de rede). Os testes de isolamento rodam num Postgres local com uma imitação mínima do Supabase. No CI do GitHub os mesmos testes rodam contra o Supabase completo.

## D013 · 2026-11-23 · Escritas das tabelas de base pelo servidor
Empresas, vínculos e convites só são alterados por ações do servidor, que checam a permissão no código e usam a chave secreta. O papel `authenticated` só lê essas tabelas, filtrado pelo RLS. O autor real da ação vai em cabeçalhos (`x-actor-type`, `x-actor-id`) que o gatilho de auditoria só aceita quando a chamada vem da chave secreta.
**Motivo:** convites dependem da API administrativa do Supabase Auth, que já exige o servidor. Concentrar as regras num lugar só evita brechas.

## D014 · 2026-11-23 · Fluxo de convite
- Cadastro aberto desligado. Só entra quem é convidado.
- Novo usuário: recebe e-mail, cria a senha e só então o vínculo com a empresa é criado.
- Usuário que já usa o sistema em outra empresa: entra direto na equipe.
- Usuário que tem conta mas nunca entrou: recebe de novo o link para criar a senha.
- O limite de usuários conta vínculos ativos mais convites pendentes.
- Os links de e-mail usam `token_hash`, que funciona mesmo se a pessoa abrir o e-mail em outro aparelho.

## D015 · 2026-11-23 · Regras comerciais no banco
- A situação da oportunidade (em aberto, ganha, perdida) é calculada pelo banco a partir da etapa. A tela não consegue gravar uma situação diferente.
- Escrita liberada coluna por coluna: campos do sistema (situação, encerramento, origem, datas) não podem ser alterados pelo usuário.
- Nada é apagado: contatos são arquivados, oportunidades são encerradas, etapas são arquivadas. Isso preserva o histórico para a análise da IA.
- Valores em centavos (inteiro) para evitar erro de arredondamento.
- Telefones no padrão E.164, com o 9 incluído em celulares antigos, para casar com o WhatsApp.
- Datas dos próximos passos são gravadas em UTC e mostradas no fuso da empresa.

## D016 · 2026-11-23 · Formato padrão de entrada
Três eventos: `contact.upsert`, `opportunity.upsert` e `message`. Toda fonte (CRM, automação, planilha, WhatsApp) é traduzida para eles e passa pelo mesmo processador. O evento bruto fica guardado antes do processamento, o que permite reprocessar depois de corrigir um mapeamento. O autor no histórico é a própria fonte (`actor_type = integration`).
**Motivo:** um único caminho para qualquer fonte, sem código especial por ferramenta (D004, D009).

## D017 · 2026-11-23 · Conversas e métricas
Uma conversa por cliente e por número conectado. Mensagens são imutáveis e não entram no histórico central (volume alto; elas já são o registro). Os números do dia são calculados na hora por uma função no banco que respeita o RLS. Se o volume crescer, passam a ser guardados por dia.

## D018 · 2026-11-23 · Conexão por QR Code com Evolution API
A Evolution API (código aberto) mantém a sessão do WhatsApp e avisa o Head a cada mensagem. A chave vai no endereço do aviso, porque a Evolution não manda cabeçalho de autenticação; o banco guarda só a impressão digital. A conexão é criada só leitura e ignora grupos. O aceite do aviso de risco fica registrado na configuração da fonte (quem e quando).
**Pendente:** servidor real (custo mensal), com autorização do proprietário.

## D019 · 2026-11-27 · Alertas calculados no banco
Uma função no banco (refresh_alerts) calcula as oito situações de alerta de uma empresa de uma vez, grava sem duplicar e resolve o que deixou de valer. Roda pelo agendador a cada 15 minutos e na hora em que alguém abre o painel, se algo mudou desde o último cálculo ou se ele tem mais de 5 minutos. A leitura em frases para o líder é feita por regras simples; a interpretação com IA entra na Fase 6.
**Observação:** o agendador da Vercel a cada 15 minutos exige o plano pago (no gratuito, uma vez por dia). O recálculo na hora cobre o uso normal mesmo sem o agendador.

## D020 · 2026-11-27 · Busca por texto agora, vetores depois
O cérebro central começa com a busca por texto do próprio Postgres: português, sem diferenciar acentos, pelo começo das palavras longas (assim "objeção" encontra "objeções") e com os trechos que têm mais palavras da pergunta no topo. Cada documento vira trechos de cerca de 1.200 caracteres, cortados em títulos, parágrafos e frases, com um pequeno pedaço repetido entre um trecho e outro para não perder o contexto.

Arquivos aceitos: texto colado, .txt, .md, .pdf (com texto, não imagem escaneada) e .docx, até 4 MB por arquivo, que é o limite de envio da Vercel.

**Motivo:** funciona sem fornecedor nem custo novo e já atende perguntas com palavras do documento. A busca por significado (ex.: "cliente sumiu" encontrar "lead parou de responder") pede vetores, que dependem de um fornecedor (P3). Vamos medir a qualidade com o acervo real e com a base de calibragem antes de escolher.
**Consequências:** a tabela de trechos já está pronta para receber uma coluna de vetor. Quando entrar, a busca passa a juntar os dois resultados (híbrida).
**Pode rever?** Sim, sem perda: os trechos ficam guardados e só ganham o vetor.

## D021 · 2026-11-27 · Como os agentes funcionam
- **Laço próprio na API de mensagens (D005).** O modelo pede uma consulta, o servidor executa e devolve o resultado, até a resposta final, com no máximo 8 voltas por pergunta. Modelo `claude-opus-5-5`, com pensamento adaptativo (sempre ligado nesse modelo) e esforço médio no chat e alto na análise.
- **As ferramentas leem com o login da própria pessoa.** O RLS continua decidindo tudo: o agente do vendedor só enxerga o que o vendedor enxerga. A única exceção é a busca no conhecimento, que inclui a metodologia Orbion; ela roda pelo servidor, sempre presa à empresa ativa da pessoa, e devolve só trechos.
- **Conversa com o agente é pessoal.** Nem o líder lê o chat de outra pessoa. O líder acompanha pelo que já existe: alertas, relatórios e análises.
- **A conversa continua sem perder nada.** Cada resposta é gravada com os blocos originais da API (pensamento e consultas) e reenviada igual nas perguntas seguintes. Uma conversa vai até 80 mensagens; depois o sistema pede para começar outra.
- **Reserva quando o modelo recusa.** As chamadas usam a reserva automática da API (`fallbacks: "default"`): se o modelo principal recusar, outro modelo responde na mesma chamada. Se todos recusarem, a pessoa vê uma mensagem clara.
- **Cache das instruções.** A parte fixa das instruções e a lista de ferramentas vão sempre iguais e marcadas para cache. O contexto do dia (empresa, pessoa, data) vem depois, para não quebrar o cache.
- **Custo registrado.** Cada pergunta ou análise grava modelo, tokens (incluindo os lidos do cache), tempo e custo estimado em `ai_runs`. A administração vê o consumo por empresa; o líder vê o da própria empresa.
- **Analista de Conversas.** Só roda quando alguém pede (D006). Recebe a conversa, trechos da metodologia e até três casos de calibragem (os da empresa primeiro) e devolve uma avaliação em formato fixo: resumo, nota, critérios, pontos fortes, o que melhorar, objeções, recomendações e próximo passo.
- **Testes sem custo.** No CI, um servidor falso imita a API da Anthropic. Os testes conferem o laço com ferramentas, o histórico reenviado, a recusa, o isolamento entre vendedores e o formato do que vai para a API.

- **Resposta aos poucos.** O chat usa uma rota própria (`/api/assistente`) que devolve uma linha por evento: conversa aberta, consulta em andamento, pedaço do texto, fim ou erro. A tela mostra o texto enquanto ele é escrito e "Consultando: oportunidades..." durante as consultas. No fim, a conversa gravada substitui a prévia.
- **Resumo do dia.** O líder liga em Configurações e escolhe o horário (5h a 12h). O agendador passa a cada hora e gera uma vez por dia por empresa: o servidor junta os números de ontem e a situação de agora (conversas, mensagens, ganhos, perdas, relatórios, alertas por pessoa, maiores negociações, divergências), a IA escreve o texto e cada líder recebe como uma conversa no chat, com destaque no Início. Uma chamada por empresa, não uma por líder.
**Pode rever?** Sim. Trocar para Managed Agents em tarefas longas continua possível (D005).

## D022 · 2026-11-27 · Chaves das integrações pela tela
A chave da Anthropic e a do servidor do WhatsApp podem ser coladas pela administração na tela "Chaves e integrações". O valor é cifrado pelo servidor (AES-256-GCM, chave em `SECRETS_ENCRYPTION_KEY`) e guardado numa tabela que nenhum usuário lê, nem a administração. A tela mostra só o final. Sem valor na tela, vale a variável de ambiente.
**Motivo:** o proprietário quer preencher as integrações depois, sem depender de quem administra o servidor.
**Consequência:** se `SECRETS_ENCRYPTION_KEY` mudar, as chaves salvas precisam ser coladas de novo (o sistema avisa no log).

## D023 · 2026-11-27 · Treinamentos ligados à régua da análise
Cada treinamento trabalha uma das habilidades que o Analista de Conversas avalia (abertura, diagnóstico, valor, objeções, próximo passo, agilidade). Assim a análise aponta a habilidade fraca e o sistema acha o treinamento certo, primeiro o da empresa e depois o da Orbion. A evolução compara a nota da habilidade antes e depois da conclusão. A recomendação é feita por regra (nota até 5), sem custo de IA.
**Pode rever?** Sim. A IA pode escrever o motivo e escolher entre vários treinamentos quando a biblioteca crescer.

## Decisões pendentes com o proprietário
- P3: Fornecedor de vetores para a busca do cérebro central (recomendação: Voyage AI, indicado pela Anthropic). Decidir quando o acervo real estiver carregado, comparando a busca atual com a busca por significado (D020).
