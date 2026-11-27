# Roadmap

## Mapa de módulos

| # | Módulo | Objetivo | Depende de | Prioridade | Pronto quando |
|---|---|---|---|---|---|
| M0 | Fundação | Projeto, login, empresas, usuários, papéis, isolamento | nada | P0 | Usuário de uma empresa não consegue ler nenhum dado de outra, comprovado por teste automático. Convite, login e recuperação de senha funcionando. |
| M1 | Histórico central | Registrar toda ação com autor, data e mudança | M0 | P0 | Toda criação e edição dos módulos seguintes gera registro. Tela de histórico por registro. |
| M2 | Contatos e oportunidades | Funil configurável, oportunidades, próximos passos, objeções, perda | M0, M1 | P0 | Cadastrar, editar, filtrar, mover de etapa, encerrar com motivo. Histórico de cada mudança visível. |
| M3 | Captura (integrações + WhatsApp) | Receber conversas e mensagens automaticamente | M0, M1, M2 | P0 | Mensagem enviada e recebida aparece no sistema ligada ao contato e ao vendedor. Métricas do dia calculadas. |
| M4 | Relatórios configuráveis | Admin define perguntas e horário por empresa | M0, M1 | P0 | Admin cria modelo, vendedor recebe no horário certo, preenche, líder vê. Dia atual ou anterior respeitado. |
| M5 | Cruzamento e divergências | Comparar o declarado com o capturado | M3, M4 | P0 | Divergência criada quando a diferença passa da tolerância. Vendedor justifica, líder marca como verificada. |
| M6 | Alertas | Regras simples que chamam atenção | M2, M3, M4 | P0 | Os 8 alertas do documento funcionando e testados. |
| M7 | Painel do vendedor | Responder "o que eu faço agora?" | M2 a M6 | P0 | Prioridades do dia, próximos passos, paradas, divergências, indicadores simples, recomendações. |
| M8 | Painel do líder | Responder "o que merece minha atenção?" | M2 a M6 | P0 | Visão do time, por vendedor, alertas e divergências consolidadas. |
| M9 | Cérebro central | Base de conhecimento e base de calibragem | M0 | P1 | Documentos carregados, divididos em trechos e encontrados pela busca. Casos de calibragem cadastrados. |
| M10 | Memória | Contexto da empresa e de cada vendedor | M1, M9 | P1 | Fatos de memória com origem e data, usados pelos agentes. Tela para ver e corrigir. |
| M11 | Agentes de IA | Equipe de agentes com o mesmo banco e papéis diferentes | M9, M10 | P1 | Chat com agente identificado em cada resposta, ferramentas com permissão do usuário, custo registrado. |
| M12 | Análise de conversas | Avaliação profunda de conversas escolhidas | M3, M11 | P1 | Resultado estruturado por critério, calibrado contra os casos reais, salvo na memória do vendedor. |
| M13 | Treinamentos e desenvolvimento | Recomendar, registrar conclusão, acompanhar evolução | M11, M12 | P1 | Ciclo completo: problema identificado, treinamento recomendado, conclusão registrada, evolução observada. |
| M14 | Head proativo | Resumo diário e alertas interpretados pelo Head | M6, M11 | P1 | Líder e vendedor recebem leitura simples da operação sem precisar perguntar. |
| M15 | Documentos comerciais | Criar, guardar e versionar playbooks, scripts etc. | M9, M11 | P2 | Documento com versões e datas de vigência, criado com ajuda dos agentes. |
| M16 | Planos de ação | Transformar recomendação em tarefa com dono e prazo | M11 | P2 | Ação criada a partir de recomendação, acompanhada até a conclusão. |
| M17 | Maturidade comercial | Mostrar o próximo passo de evolução da operação | M9 a M16 | P2 | Avaliação de nível e recomendação de próximo passo por empresa. |
| M18 | Administração da plataforma | Gerir empresas, usuários, agentes, base, uso de IA | cresce junto | P0 a P2 | Cada módulo entrega a sua parte administrativa. |

## Fases

Cada fase termina com algo funcionando e testado.

### Fase 0: Fundação
Projeto novo, padrão visual, Supabase local, login, convite, empresas, papéis, isolamento por empresa com testes automáticos, histórico central, CI rodando testes a cada envio.

### Fase 1: Núcleo comercial
Funil configurável, contatos, oportunidades, próximos passos, objeções, encerramento com motivo, histórico de alterações. Primeira versão dos painéis com dados reais.

### Fase 2: Captura
Camada de integrações (entrada bruta, processador, webhook genérico). WhatsApp em dois modos: aparelho por QR Code (primeiro, porque é o que a Orbion usa) e API oficial. Tela de conexões com status de cada número. Conexão com CRM: formato padrão, tela de mapeamento de etapas e campos, webhook e API de entrada, importação por planilha e o primeiro conector nativo (o CRM da operação piloto). Conversas, mensagens, ligação com contato, vendedor e oportunidade. Métricas diárias (interações, tempo de resposta, clientes aguardando retorno).

### Fase 3: Relatórios e cruzamento
Editor de modelos de relatório no admin, agendamento por horário, preenchimento, lembretes, regras de cruzamento e divergências com justificativa.

### Fase 4: Alertas e painéis completos
Motor de alertas agendado. Painel do vendedor e painel do líder completos.

### Fase 5: Cérebro e memória
Carga de documentos (PDF, Word, texto, Markdown), divisão em trechos, busca por texto (a busca por significado entra com o acervo real, D020), tags, base de calibragem, memória da empresa e do vendedor. **Concluída.** Falta a importação em lote do acervo de mais de mil documentos, que depende de saber onde ele está.

### Fase 6: Agentes e análise de conversas
Orquestrador de agentes, chat com identificação do agente, ferramentas de consulta com permissão do usuário, Head Comercial e Analista de Conversas, análise estruturada calibrada, registro de custo, Head proativo com resumo diário. **Concluída** (testada com a API simulada; falta conferir a qualidade com a chave real).

### Fase 7: Desenvolvimento
Biblioteca de treinamentos, recomendação pelo Especialista de Desenvolvimento, conclusão, acompanhamento da evolução nas conversas seguintes. **Concluída.** A recomendação usa regras (habilidade com nota até 5); o texto do motivo escrito pela IA pode entrar depois.

### Fase 8: Documentos, planos de ação e demais agentes
Documentos comerciais com versões (Estrategista Comercial), planos de ação (Gestor de Projetos), Sales Ops. **Concluída.**

### Fase 9: Preparação para clientes convidados
Maturidade comercial, primeira versão do Analista de Receita, termos e aviso de privacidade, monitoramento de erros, backups verificados, limites de uso, ajustes do piloto interno. **Construída;** a conferência das cópias de segurança e os ajustes do piloto acontecem depois de publicar.

## Definição do MVP

**MVP interno (Fases 0 a 7):** a operação da Orbion usa o sistema de verdade. WhatsApp capturado, oportunidades acompanhadas, relatório configurado, divergências, alertas, painéis, cérebro central, Head Comercial, Analista de Conversas, Especialista de Desenvolvimento e treinamentos. Esse conjunto já entrega o ciclo completo: observar, mostrar, orientar, ensinar e acompanhar.

**MVP para clientes convidados (Fases 8 e 9):** acrescenta documentos versionados, planos de ação, demais agentes, maturidade e a preparação de segurança e privacidade para receber dados de outras empresas.

**Depois do MVP:** cobrança e assinaturas, novos conectores nativos de CRM conforme a demanda dos clientes, alertas por padrão estatístico, notificações por WhatsApp e e-mail, Analista de Receita completo, aplicativo para celular.

## Observação sobre a ordem

O modo aparelho não depende de aprovação da Meta, então a captura da Orbion pode começar logo na Fase 2. O modo API oficial pode ser terminado depois, quando o primeiro cliente que usa API entrar.
