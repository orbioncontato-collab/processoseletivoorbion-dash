# Progresso

Última atualização: 2026-11-27 (Fase 3 concluída; Fase 4 em andamento)

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

## Em desenvolvimento
- Fase 4: alertas e painéis completos. Motor de alertas no banco pronto e testado (7 testes); faltam agendamento, telas e configurações.

## Pendente
- Ligar o WhatsApp de verdade: subir o servidor da Evolution (guia em SETUP.md, seção 4), depende da autorização do gasto.
- Primeiro conector nativo de CRM (hoje qualquer CRM entra pelo webhook ou planilha).
- Fases 3 a 9 (ver ROADMAP.md).

## Bloqueios e pendências com o proprietário
1. **Repositório novo:** o proprietário cria `head-comercial-orbion` (privado, vazio) no GitHub e informa. Enquanto isso, o código vive na pasta `head-comercial/` da branch `claude/gifted-hypatia-owccnl` deste repositório.

## Vai ser necessário mais tarde (sem bloqueio agora)
- Projeto no Supabase e na Vercel para publicar (guia em SETUP.md). Envolve custo mensal, por isso só será criado com autorização.
- Provedor de e-mail (SMTP) para os convites em produção.
- Chave da API da Anthropic (Fase 6).
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
**Fase 3: relatórios configuráveis e cruzamento.** O administrador define as perguntas do relatório de cada empresa e o horário; o vendedor responde; o Head compara o que foi informado com o que foi capturado (conversas e oportunidades) e aponta divergências, sem acusar ninguém.
