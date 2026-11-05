# Testes de precisão e de funcionamento

Este documento registra os testes que **foram realmente executados** na versão 1.0.0, em 05/11/2026, e também o que ainda falta testar.

## Como rodar

```bash
npm test
```

```bash
npm run test:ui
```

```bash
npm run report
```

| Comando | O que faz | Resultado obtido |
|---|---|---|
| `npm test` | 42 testes do motor matemático no Node 22 (`tests/engine.test.js`) | 42 de 42 passaram |
| `npm run test:ui` | Gera `dist/index.html` e roda 76 verificações no Chromium (Playwright), abrindo o arquivo via `file://` | 76 de 76 passaram |
| `npm run report` | Calcula a bateria obrigatória e grava `RELATORIO-PRECISAO.md` | 19 de 19 dentro da tolerância |

Tolerância numérica: diferença absoluta de até 1 × 10⁻⁹ × max(1, |esperado|). Nos casos com valor aproximado na especificação (≈), o teste compara com o valor exato da fórmula (por exemplo 20/3 ou √3 × 3040).

## Bateria obrigatória (seção 10 da especificação)

| Ferramenta | Entradas | Esperado | Obtido no app | Situação |
|---|---|---|---|---|
| Lei de Ohm | V=12 V, R=6 Ω | I=2 A | 2 A | Passou |
| Potência CC | V=24 V, I=3 A | P=72 W | 72 W | Passou |
| Energia | 500 W, 4 h/dia, 30 dias, R$ 0,80/kWh | 60 kWh e R$ 48 | 60 kWh e R$ 48,00 | Passou |
| Resistores | 10 Ω e 20 Ω em série | 30 Ω | 30 Ω | Passou |
| Resistores | 10 Ω e 20 Ω em paralelo | ≈6,667 Ω | 6,6667 Ω (4 casas) | Passou |
| Divisor de tensão | 12 V, 1 kΩ e 2 kΩ | VR2=8 V | VR2 = 8 V, VR1 = 4 V, I = 4 mA | Passou |
| Divisor de corrente | 3 A, 2 Ω e 4 Ω | I1=2 A e I2=1 A | 2 A e 1 A | Passou |
| Frequência | 50 Hz | T=0,02 s | 20 ms (0,02 s) | Passou |
| Reatância indutiva | 60 Hz, 0,1 H | XL≈37,699 Ω | 37,6991 Ω | Passou |
| Impedância RL | R=10 Ω, L=0,1 H, f=60 Hz | \|Z\|≈39,003 Ω | 39,0029 Ω | Passou |
| Potência monofásica | 120 V, 5 A, FP=0,8 | P=480 W | 480 W (S = 600 VA, Q = +360 var) | Passou |
| Potência trifásica | 380 V, 10 A, FP=0,8 | P≈5.265,43 W | 5,2654 kW (5.265,4345 W) | Passou |
| Conversão | 2,2 kΩ para Ω | 2.200 Ω | 2.200 Ω | Passou |

O detalhe com diferença numérica de cada caso está em `RELATORIO-PRECISAO.md`.

## Validações testadas no motor

| Situação | Comportamento verificado |
|---|---|
| Divisão por zero (R = 0 em I = V/R, I = 0 em R = V/I) | Recusado com "Informe uma resistência maior que zero para realizar este cálculo." |
| Campos vazios | Uma mensagem por campo ("Preencha o campo ...") |
| Texto não numérico | Recusado |
| Negativos inválidos (resistência, capacitância, valor de resistência no conversor) | Recusados. Tensão negativa continua aceita onde faz sentido |
| Vírgula decimal, ponto decimal, milhar, notação científica | 14 formatos aceitos corretamente |
| Números ambíguos (`1.234`, `1.000`, `12.500`) e malformados | 10 formatos recusados, nenhum interpretado em silêncio |
| Fator de potência fora de 0 a 1 | Recusado |
| Carga resistiva com FP diferente de 1 | Recusado (a interface trava em 1) |
| Uso diário acima de 24 h | Recusado |
| Valores fora da faixa (1e30, 1e-30) | Recusados com orientação para conferir a unidade |
| Valores próximos de zero (1 mV / 1 MΩ) | Mostra 1 nA, sem virar zero |
| Conversões entre prefixos (9 casos, ida e volta) | Exatas dentro de 10⁻¹² relativo |
| Conversão entre grandezas diferentes | Recusada |
| RLC em ressonância com R = 0 | Aviso de curto-circuito ideal, sem divisão por zero |
| Os 12 exemplos com 2, 4 e 6 casas | Calculam, têm memória de cálculo e hipóteses, sem `NaN`, `Infinity` ou `undefined` |

## Verificações de interface (Chromium, arquivo aberto via file://)

- Página inicial com 12 cartões, busca (com e sem acento), filtros por categoria e favoritas.
- "Carregar exemplo" das 12 calculadoras preenche, calcula e mostra o valor esperado e a memória de cálculo.
- Botão Calcular, tecla Enter e atualização automática depois do primeiro cálculo.
- Resultado antigo some quando a entrada fica inválida.
- Mensagens de erro no campo certo, sem `NaN`/`Infinity`/`undefined` na tela.
- Troca de modo esconde e mostra os campos corretos.
- Precisão 2, 4 e 6 casas muda a exibição.
- Lista de resistores: adicionar, remover, mínimo de 2 e máximo de 10.
- Conversor instantâneo e só com unidades compatíveis.
- Copiar resultado e copiar resolução (conteúdo da área de transferência conferido).
- Imprimir: chama a impressão, monta relatório com produto, título, dados, resultados, fórmula e hipóteses; no modo de impressão só o relatório aparece. Um PDF A4 foi gerado pelo Chromium e conferido visualmente.
- Histórico: registra, persiste após recarregar, reabre, exclui e limpa com confirmação.
- Favoritas: salvam e aparecem no menu após recarregar.
- Sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, em todas as páginas.
- Menu do celular abre, navega e fecha.
- Com armazenamento local bloqueado, o app funciona e avisa que o histórico vale só na sessão.
- Offline: todas as requisições que não fossem `file://` ou `data:` foram bloqueadas e contadas. Nenhuma aconteceu.
- Nenhum erro no console nos fluxos acima.

## O que ainda não foi testado

Estes itens **não** foram executados e devem ser conferidos antes da venda:

- Navegadores Safari (iPhone/Mac) e Firefox. Os testes automáticos usaram apenas o Chromium.
- Aparelhos físicos (celulares e tablets reais). Os testes usaram janelas de tamanho de celular.
- Diálogo real de impressão do sistema operacional (o teste substitui `window.print` e gera o PDF pelo próprio Chromium).
- Leitores de tela (NVDA, VoiceOver). A navegação por teclado e os rótulos foram implementados, mas não auditados com leitor de tela.
- Revisão técnica por profissional habilitado (roteiro em `REVISAO-TECNICA.md`).
