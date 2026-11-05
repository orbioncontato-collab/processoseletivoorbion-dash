# MapaElétrica Calc

**Kit de Calculadoras Elétricas Automáticas.** Seus cálculos de Engenharia Elétrica, resolvidos e explicados em segundos.

Aplicativo web com 12 calculadoras para estudantes de Engenharia Elétrica. Cada uma mostra o resultado, a fórmula, a substituição dos números e uma explicação. Tudo roda no aparelho, sem login, sem servidor e sem internet. O produto final é um único arquivo: `dist/index.html`.

> Ferramenta educacional. Não substitui normas técnicas, projetos, medições nem profissionais habilitados.

## As 12 calculadoras

| Categoria | Calculadoras |
|---|---|
| Fundamentos elétricos | 01 Lei de Ohm, 02 Potência CC, 03 Energia e Consumo |
| Circuitos resistivos | 04 Associação de Resistores, 05 Divisor de Tensão, 06 Divisor de Corrente |
| Corrente alternada | 07 Frequência e Período, 08 Reatância, 09 Impedância RLC |
| Potência e utilidades | 10 Potência Monofásica, 11 Potência Trifásica, 12 Conversor de Unidades |

## Arquitetura

O código é JavaScript puro, sem bibliotecas. A matemática fica separada da interface:

```
src/
  index.html          esqueleto da página
  css/styles.css      visual (claro, azul-marinho, responsivo, impressão)
  js/numbers.js       leitura de números no padrão brasileiro e formatação (prefixos, notação científica)
  js/units.js         grandezas, unidades e conversões para o SI
  js/validate.js      validação centralizada e mensagens de erro
  js/calculators.js   as 12 calculadoras: campos, exemplos, fórmulas e resolução passo a passo
  js/report.js        textos de cópia e resumos do histórico
  js/diagrams.js      esquemas em SVG (circuitos, triângulos, estrela e triângulo)
  js/app.js           interface: rotas, formulários, histórico, favoritas, cópia e impressão
scripts/
  build.js            junta tudo em dist/index.html
  precision-report.js gera docs/RELATORIO-PRECISAO.md
tests/
  engine.test.js      testes do motor (node --test)
  ui.test.js          testes no navegador (Playwright)
docs/
  FORMULAS.md, GUIA-DE-USO.md, DISTRIBUICAO.md, TESTES.md, RELATORIO-PRECISAO.md, REVISAO-TECNICA.md
```

Os arquivos `numbers.js` a `diagrams.js` não tocam no DOM. Por isso os mesmos arquivos rodam no navegador e nos testes do Node.

Como uma calculadora funciona por dentro: `calculators.run(id, estado)` lê os textos digitados, converte para o SI, valida, resolve e devolve um objeto com resultados, etapas, avisos e hipóteses. A interface só desenha esse objeto. Assim, para criar uma 13ª calculadora basta adicionar uma definição em `calculators.js`.

## Comandos

Requer Node 18 ou mais novo. Não há dependências para instalar.

```bash
npm run build
```

```bash
npm test
```

```bash
npm run test:ui
```

```bash
npm run report
```

`test:ui` precisa do Playwright (`npm i -D playwright` e `npx playwright install chromium`).

Para desenvolver, abra `src/index.html` direto no navegador. Ele carrega os arquivos separados. O `dist/index.html` é a versão de entrega, com tudo embutido.

## Critérios de aprovação (seção 12)

- [x] As 12 calculadoras estão implementadas.
- [x] As fórmulas foram verificadas por testes automáticos (`docs/TESTES.md`).
- [x] Resultados numericamente consistentes (19 de 19 casos dentro da tolerância).
- [x] Unidades com prefixo automático e valor no SI.
- [x] Os 12 exemplos funcionam.
- [x] A memória de cálculo é exibida.
- [x] Os avisos de erro funcionam.
- [x] Layout testado de 320 px a 1440 px, sem rolagem horizontal.
- [x] Busca e navegação funcionam.
- [x] Botões de copiar funcionam.
- [x] Impressão e PDF funcionam (testado no Chromium).
- [x] O arquivo final funciona sem internet (nenhuma requisição externa).
- [x] Nenhum erro no console nos fluxos testados.
- [x] Documentação de uso completa (`docs/GUIA-DE-USO.md`).
- [x] Hipóteses e limitações explícitas em cada calculadora e em `docs/FORMULAS.md`.
- [ ] Revisão técnica independente: **prevista, ainda não feita**. Roteiro em `docs/REVISAO-TECNICA.md`.

Pendências antes da venda, além da revisão técnica: testar em Safari e Firefox, em aparelhos reais e com leitor de tela (detalhes em `docs/TESTES.md`).
