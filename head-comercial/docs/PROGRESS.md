# Progresso

Última atualização: 2026-11-27 (Fases 0 a 9 construídas e validadas)

## Concluído e validado

### Planejamento
- Diagnóstico, visão, arquitetura, roadmap, decisões e estratégia de testes.
- Decisões do proprietário: repositório novo (D007), WhatsApp em dois modos (D008), oportunidades próprias com qualquer CRM conectável (D009).

### Fase 0: Fundação
| Item | Situação |
|---|---|
| Projeto Next.js 16 + TypeScript + Tailwind, padrão visual Orbion, componentes base | Pronto |
| Banco: empresas, perfis, vínculos com papel, convites, admins da plataforma | Pronto |
| Isolamento entre empresas e entre papéis no próprio banco (RLS) | Pronto |
| Histórico central imutável, com autor (pessoa, integração, automação, agente, sistema) e o que mudou | Pronto |
| Login, saída, recuperação de senha, criação de senha pelo link do e-mail | Pronto |
| Convite de líder e vendedor, limite de vagas, cancelamento, reenvio, aceite automático | Pronto |
| Gestão da equipe (desativar e reativar), troca de empresa ativa, perfil (nome e senha) | Pronto |
| Página de histórico para o líder | Pronto |
| Administração de empresas para a equipe Orbion | Pronto |
| CI no GitHub rodando tudo a cada envio | Pronto |

**Validação real (CI, execução 4, 2026-11-23):**
- Lint e checagem de tipos: sem erros.
- 20 testes de unidade: todos passaram.
- 25 testes de isolamento no Supabase real: todos passaram.
- Build de produção: passou.
- 9 cenários de ponta a ponta no navegador com Supabase real: todos passaram (admin cria empresa, convida líder, líder cria senha, convida vendedor, vendedor bloqueado nas páginas de líder e admin, histórico com autores, desativação corta o acesso, troca de nome).

**Problemas encontrados pelos testes e corrigidos:**
1. Páginas logadas usavam o relógio durante o pré-carregamento do Next.js 16. Corrigido com `connection()`.
2. O link do e-mail redirecionava para o endereço interno do servidor e o login se perdia. Corrigido com redirecionamento relativo.

### Fase 1: Núcleo comercial
| Item | Situação |
|---|---|
| Funil padrão criado automaticamente para cada empresa (7 etapas), configurável pelo líder: renomear, reordenar, adicionar, arquivar | Pronto |
| Travas do funil: não arquiva etapa com negociações abertas; sempre mantém etapa aberta, de ganho e de perda | Pronto |
| Contatos com telefone no padrão internacional (sem duplicar na mesma empresa), e-mail, empresa do cliente, observações, arquivamento | Pronto |
| Oportunidades: contato, responsável, produto, valor, etapa, próximo passo com data, previsão de fechamento | Pronto |
| Situação segue a etapa (em aberto, ganha, perdida); perda exige motivo; reabrir limpa o motivo | Pronto |
| Última movimentação registrada (base para o alerta de negociação parada) | Pronto |
| Objeções por oportunidade, com tipo e status (resolvida ou não) | Pronto |
| Linha do tempo de cada negociação, com frases legíveis e autor | Pronto |
| Lista com filtros (situação, etapa, responsável, vencidos, hoje, sem próximo passo, paradas, busca) e resumo do funil | Pronto |
| Início com números reais e prioridades do dia | Pronto |
| Vendedor vê só o que é dele; líder vê e transfere tudo do time; nada aponta para dados de outra empresa | Pronto |

**Validação real (CI, execução 7, 2026-11-23):**
- 76 testes de unidade: todos passaram (telefone, dinheiro, fuso horário, validações, frases do histórico, erros).
- 53 testes de banco no Supabase real: todos passaram (25 da Fase 0 + 28 da Fase 1).
- 21 cenários de ponta a ponta: todos passaram (9 da Fase 0 + 12 da Fase 1).
- Prova de que os testes pegam falhas: com duas travas desligadas de propósito, 7 testes falharam.

### Fase 2: Captura (partes 1 a 3)
| Item | Situação |
|---|---|
| Fontes de integração por empresa, chave guardada só como impressão digital, mostrada uma vez | Pronto |
| Entrada única `POST /api/webhooks/ingest/{fonte}` no formato padrão (contato, oportunidade, mensagem), lote de até 100, idempotência | Pronto |
| Eventos brutos guardados com situação e motivo da falha; reprocessamento | Pronto |
| Tradução: etapa (mapeamento > mesmo nome > situação), valor em reais, motivo de perda livre para a lista | Pronto |
| Atualização vinda de fora não apaga campos que a fonte não enviou | Pronto |
| Tela de integrações: conexões, mapeamento de etapas, dados recebidos | Pronto |
| Importação por planilha CSV (";" ou ",", sinônimos de coluna, até 500 linhas), reimportação sem duplicar | Pronto |
| Conversas e mensagens ligadas ao contato e ao vendedor; contato criado pelo telefone; grupos ignorados | Pronto |
| Cliente esperando resposta; resposta do vendedor movimenta a negociação | Pronto |
| Números do dia por vendedor: conversas, mensagens, tempo médio de 1ª resposta, esperando retorno | Pronto |
| Telas de conversas e "WhatsApp hoje" no início | Pronto |

| WhatsApp por QR Code: líder cria a conexão por vendedor com aviso de risco aceito e registrado; vendedor conecta em Meu WhatsApp; QR Code, verificação e desconexão; somente leitura | Pronto no código, falta o servidor real |
| Tradutor dos avisos da Evolution API (mensagens, conexão), ignora grupos e status, trata contas @lid | Pronto, a conferir com servidor real |

**Validação real (CI, execução 13, 2026-11-23):**
- 117 testes de unidade: todos passaram.
- 69 testes de banco no Supabase real: todos passaram.
- 39 cenários de ponta a ponta: todos passaram (6 do WhatsApp, usando um servidor falso da Evolution que imita o real).

### Fase 3: Relatórios e cruzamento
| Item | Situação |
|---|---|
| Modelo de relatório por empresa, configurado pela administração: nome, horário, dias de trabalho, sobre o dia ou o dia anterior | Pronto |
| Perguntas de número, valor, texto, escolha única, várias escolhas, sim ou não; obrigatórias ou opcionais; ordem | Pronto |
| Pergunta ligada a número capturado (conversas e mensagens do WhatsApp, oportunidades criadas e ganhas, valor ganho, entradas numa etapa) com margem em % e mínima | Pronto |
| Vendedor responde o relatório pendente, corrige depois e vê os últimos dias (enviado ou pendente) | Pronto |
| Cruzamento ao enviar: divergência só quando passa da margem; WhatsApp só para quem tem conexão | Pronto |
| Vendedor explica; líder verifica ou reabre; texto neutro ("pode haver atividade fora dos canais conectados") | Pronto |
| Líder vê quem enviou, as respostas do time e as divergências; cartão no início | Pronto |

**Validação real (CI, execução 16, 2026-11-27):** 129 testes de unidade, 82 de banco e 44 cenários de ponta a ponta, todos passaram. O teste de ponta a ponta encontrou um erro real (o Supabase recusava a gravação das respostas porque a gravação tentava regravar colunas protegidas), corrigido antes de fechar a fase.

### Fase 4: Alertas e painéis
| Item | Situação |
|---|---|
| 8 alertas: próximo passo vencido e de hoje, sem próximo passo, negociação parada, cliente esperando resposta, produção abaixo da referência, relatório não preenchido, divergência em aberto | Pronto |
| Alertas com dono, gravidade e situação; sem duplicar; resolvem sozinhos; dispensa registrada e respeitada | Pronto |
| Recálculo pelo agendador (a cada 15 min) e na hora em que algo muda | Pronto |
| Referências do líder: dias para parada, horas de espera, tolerância do relatório, metas diárias | Pronto |
| Vendedor: "O que fazer agora" por urgência, com link direto | Pronto |
| Líder: leitura do time em frases e "quem merece atenção" | Pronto |
| Página de alertas com filtros por tipo e pessoa | Pronto |

**Validação real (CI, execução 20, 2026-11-27):** 137 testes de unidade, 90 de banco e 49 cenários de ponta a ponta, todos passaram. Os testes de ponta a ponta encontraram dois erros reais, corrigidos: (1) o Supabase bloqueia apagar sem filtro e o cálculo dos alertas falhava pela API; (2) um alerta novo podia demorar até 5 minutos para aparecer.

### Fase 5: Cérebro central e memória
| Item | Situação |
|---|---|
| Cérebro central (metodologia Orbion), visível só para a administração e usado pelos agentes em todas as empresas | Pronto |
| Conhecimento da empresa: líder cadastra, toda a equipe consulta | Pronto |
| Documentos por texto colado ou arquivo .txt, .md, .pdf e .docx (até 4 MB), com tipo e etiquetas, arquivamento | Pronto |
| Divisão em trechos e busca em português sem diferenciar acentos ("negociacao" encontra "negociação") | Pronto |
| Base de calibragem (conversa real com a avaliação esperada), separada do conhecimento: global para a administração, da empresa para o líder | Pronto |
| Memória da empresa (vista por todos) e de cada pessoa (vista por ela e pelos líderes), com assunto, origem e data | Pronto |

**Validação real (CI, execução 27, 2026-11-27):** 146 testes de unidade, 98 de banco e 55 cenários de ponta a ponta, todos passaram. Dois ajustes nos testes: a ordem alfabética com acento muda entre o Postgres local e o Supabase, e um PDF pode virar mais de um trecho.

### Fase 6: Agentes de IA
| Item | Situação |
|---|---|
| Head Comercial no chat, para vendedor e líder, com sugestões de pergunta e histórico de conversas | Pronto, testado com a API simulada |
| O agente consulta oportunidades, detalhes e histórico, alertas, números de hoje, equipe, conversas, conhecimento e memória, sempre com as permissões da pessoa | Pronto |
| Orientação de venda baseada na metodologia e no material da empresa, citando o documento | Pronto |
| Conversa continua com o histórico completo; chat pessoal (nem o líder lê o dos outros) | Pronto |
| Reserva automática quando o modelo recusa e mensagem clara se ninguém responder | Pronto |
| Analista de Conversas: nota, critérios, pontos fortes, o que melhorar, objeções, recomendações e próximo passo, usando metodologia e casos de calibragem | Pronto, testado com a API simulada |
| Registro de cada chamada (modelo, tokens, cache, tempo, custo); consumo por empresa para a administração e do mês para o líder | Pronto |
| Resposta do chat aparece aos poucos, mostrando o que o Head está consultando | Pronto |
| Resumo do dia para os líderes: ligado em Configurações, entregue no horário escolhido como conversa no chat e em destaque no Início | Pronto, testado com a API simulada |

**Validação real (CI, execução 30, 2026-11-27):** 158 testes de unidade, 103 de banco e 64 cenários de ponta a ponta, todos passaram. Os 9 cenários dos agentes rodam contra um servidor que imita a API da Anthropic (o vendedor só vê o que é dele, histórico reenviado com as consultas, recusa, análise com o caso de calibragem, formato do que vai para a API).

**Validação real (CI, execução 33, 2026-11-27):** 161 testes de unidade, 103 de banco e 67 cenários de ponta a ponta, todos passaram. Entraram os cenários da resposta aos poucos (sem duplicar a mensagem, rota exige login e valida a pergunta) e do resumo do dia (liga, agendador entrega uma vez por dia, líder continua a conversa, vendedor não recebe).

### Chaves e integrações pela tela
| Item | Situação |
|---|---|
| A administração cola a chave da Anthropic e o endereço e a chave do servidor do WhatsApp numa tela, sem mexer no servidor | Pronto |
| Valores cifrados no banco (AES-256-GCM); a tela mostra só o final; nenhum usuário lê a tabela direto | Pronto |
| Botão "Testar conexão" confere a chave da Anthropic sem gastar tokens | Pronto |
| Sem chave na tela, vale a variável de ambiente do servidor | Pronto |

### Fase 7: Desenvolvimento do time
| Item | Situação |
|---|---|
| Biblioteca de treinamentos da Orbion (para todas as empresas) e da própria empresa, por habilidade e formato | Pronto |
| Líder indica um treinamento para alguém, com o motivo; não repete o que já está em aberto | Pronto |
| A análise de conversa recomenda sozinha o treinamento da habilidade que ficou com nota até 5, com o motivo e a nota de partida | Pronto |
| Vendedor começa e conclui; o líder pode dispensar | Pronto |
| Evolução: depois da conclusão, compara a nota da habilidade nas conversas analisadas com a nota de partida | Pronto |
| O Head consulta os treinamentos e a evolução no chat | Pronto |

**Validação real (CI, execução 36, 2026-11-27):** 168 testes de unidade, 109 de banco e 77 cenários de ponta a ponta, todos passaram. Os testes encontraram e corrigiram: o servidor falso da Anthropic procurava a chave no cabeçalho errado, e um teste de banco deixava uma chave falsa salva para os testes seguintes.

### Fase 8: Documentos, planos de ação e demais agentes
| Item | Situação |
|---|---|
| Documentos comerciais (playbook, roteiro, política de preço, processo, perfil de cliente ideal) com versões que nunca se perdem | Pronto |
| Equipe vê só a versão publicada; líder vê rascunhos e o histórico, publica qualquer versão | Pronto |
| Plano de ação com responsável, prazo, prioridade e situação; atrasadas em destaque; cartão no início | Pronto |
| Escolha do agente no chat: Head Comercial, Estrategista Comercial, Gestor de Projetos, Sales Ops (e, na Fase 9, Analista de Receita), cada um com as próprias instruções e ferramentas | Pronto |
| Estrategista grava propostas de versão como rascunho (só para líderes) | Pronto |
| Gestor de Projetos cria ações (líder para a equipe; vendedor para si) | Pronto |
| Sales Ops lê a saúde do funil: etapas, taxa de ganho, ciclo, paradas, motivos de perda | Pronto |

**Validação real (CI, execução 38, 2026-11-27):** 171 testes de unidade, 115 de banco e 86 cenários de ponta a ponta, todos passaram na primeira tentativa.

### Fase 9: Preparação para clientes convidados
| Item | Situação |
|---|---|
| Maturidade comercial em seis dimensões, com dados reais, foto mensal e dica do que melhorar | Pronto |
| Analista de Receita: projeção do mês, melhor caso, meta e divisão por vendedor | Pronto |
| Limite mensal de gasto com IA por empresa, definido pela administração | Pronto |
| Limite de envios por minuto nos webhooks | Pronto |
| Termos de uso e aviso de privacidade públicos, com aceite no primeiro acesso | Pronto (texto preliminar, falta revisão jurídica) |
| Registro dos erros do servidor e tela "Erros do sistema" | Pronto |
| Guia de agendadores e de conferência das cópias de segurança | Pronto |

**Validação real (CI, execução 39, 2026-11-27):** 176 testes de unidade, 118 de banco e 92 cenários de ponta a ponta, todos passaram na primeira tentativa. O teste de convite agora passa também pelo aceite dos termos.

## Em desenvolvimento
- Nada. O roteiro das Fases 0 a 9 está construído e validado.

## Pendente
- Ligar o WhatsApp de verdade: subir o servidor da Evolution (guia em SETUP.md, seção 4), depende da autorização do gasto.
- Primeiro conector nativo de CRM (hoje qualquer CRM entra pelo webhook ou planilha).
- Importação em lote do acervo de mais de mil documentos (depende de saber onde ele está).
- Fases 6 a 9 (ver ROADMAP.md).

## Bloqueios e pendências com o proprietário
1. **Chave da API da Anthropic:** sem ela, o chat e a análise aparecem como "IA não configurada". Tudo já foi testado com a API simulada; com a chave, falta só conferir a qualidade das respostas reais.
2. **Repositório novo:** o proprietário cria `head-comercial-orbion` (privado, vazio) no GitHub e informa. Enquanto isso, o código vive na pasta `head-comercial/` da branch `claude/gifted-hypatia-owccnl` deste repositório.

## Vai ser necessário mais tarde (sem bloqueio agora)
- Projeto no Supabase e na Vercel para publicar (guia em SETUP.md). Envolve custo mensal, por isso só será criado com autorização.
- Provedor de e-mail (SMTP) para os convites em produção.
- Acesso ao acervo de documentos (Fase 5) e conversas reais para calibragem (Fase 6).
- Modelo do relatório da operação da Orbion (Fase 3).
- Servidor para o modo aparelho do WhatsApp, com autorização de gasto (Fase 2).

## Problemas conhecidos e limitações
- Quando o líder transfere uma oportunidade, o contato continua com o responsável anterior. O novo responsável vê a negociação, mas não abre a ficha do contato. Avaliar transferência conjunta na Fase 2.
- A lista de oportunidades mostra até 200 registros por filtro. Paginação entra quando alguma empresa chegar perto disso.
- A importação por planilha roda dentro da requisição e por isso tem limite de 500 linhas. Volumes maiores pedem uma fila de processamento.
- O webhook processa os eventos na hora. Se o volume crescer (muitos números de WhatsApp), mover o processamento para uma fila.
- Não há limite de requisições por fonte no webhook ainda (entra com a preparação para clientes convidados).
- Quem já usa o sistema em outra empresa entra direto na nova equipe ao ser convidado, sem precisar aceitar. Aceitável para o piloto; revisar antes dos clientes convidados.
- No ambiente de desenvolvimento desta sessão, o Supabase completo não roda (bloqueio de rede para as imagens Docker). Os testes completos rodam no CI do GitHub.

## Próxima prioridade
**Publicar o piloto interno da Orbion.** O roteiro (Fases 0 a 9) está construído. O próximo passo é colocar no ar para a equipe da Orbion usar de verdade, o que depende do proprietário: projetos no Supabase e na Vercel (custo mensal), provedor de e-mail, chave da Anthropic, servidor do WhatsApp e revisão jurídica dos termos.

Precisa do proprietário: a chave da API da Anthropic (para conferir a qualidade real dos agentes) e, se possível, de 5 a 10 conversas reais com avaliação para a calibragem.
