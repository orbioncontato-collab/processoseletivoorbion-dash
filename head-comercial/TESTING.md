# Estratégia de testes

## Regra geral
Nenhuma funcionalidade é marcada como concluída sem teste executado. O resultado de cada execução fica registrado em PROGRESS.md.

## Tipos de teste

| Tipo | Ferramenta | O que cobre |
|---|---|---|
| Unidade | Vitest | Regras puras: normalização de telefone, cálculo de tempo de resposta, regras de alerta, cruzamento declarado x capturado, agenda de relatório com fuso horário. |
| Integração | Vitest + Supabase local (Docker) | Rotas da API e acesso ao banco com usuários reais de teste. |
| Isolamento e permissões | Vitest + Supabase local | Para cada tabela: usuário da empresa A tenta ler, editar e apagar dados da empresa B; vendedor tenta ler dados de outro vendedor. Todos precisam falhar. |
| Fluxos de tela | Playwright | Login, convite, criar oportunidade, preencher relatório, ver divergência, conversar com agente. |
| Regressão | Toda a suíte no CI a cada envio | Garante que módulo novo não quebra módulo antigo. |
| IA | Conjunto de avaliação com a base de calibragem | A análise de conversas é comparada com a avaliação esperada. Mudança de instrução só entra se a nota não cair. |
| Responsividade | Playwright em largura de celular e computador | Painéis principais legíveis no celular. |

## Como rodar (será preenchido na Fase 0)
Os comandos exatos entram aqui quando o projeto for criado.
