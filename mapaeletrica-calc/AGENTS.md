# Instruções para agentes (Codex e similares)

## O que é este projeto

MapaElétrica Calc: 12 calculadoras de Engenharia Elétrica para estudantes, em português do Brasil.
O produto final é um único arquivo, `dist/index.html`, que funciona sem internet, sem login e sem servidor.
Existe também uma versão em planilha em `planilha/MapaEletrica-Calc.xlsx`.

## Regras importantes

- Edite sempre os arquivos em `src/`. Nunca edite `dist/index.html` à mão: ele é gerado.
- Depois de mudar `src/`, rode `node scripts/build.js` para gerar `dist/index.html` de novo.
- Não adicione bibliotecas, CDNs, fontes externas nem chamadas de rede. O app precisa funcionar offline e como arquivo único.
- A matemática fica em `src/js/numbers.js`, `units.js`, `validate.js` e `calculators.js`. Esses arquivos não podem acessar o DOM.
- A interface fica em `src/js/app.js` e `src/css/styles.css`.
- Textos da interface em português do Brasil, simples, sem travessão (—).
- Mantenha os avisos de uso educacional. Não escreva que o app segue normas técnicas nem que serve para dimensionar condutores, disjuntores ou proteções.
- Nunca mostre `NaN`, `Infinity` ou `undefined` para o usuário. Erros viram mensagens simples em português.
- Valores internos não são arredondados. O arredondamento acontece só na exibição.

## Comandos

| Comando | O que faz |
|---|---|
| `node scripts/build.js` | Gera `dist/index.html` |
| `node --test tests/engine.test.js` | 42 testes do motor matemático (sem dependências) |
| `node scripts/precision-report.js` | Atualiza `docs/RELATORIO-PRECISAO.md` |
| `node tests/ui.test.js` | Testes no navegador. Precisa de `npm i -D playwright` e `npx playwright install chromium` |

Antes de entregar qualquer mudança, rode o build e os testes do motor. Se mudar a interface, rode também os testes de navegador.

## Publicação

O site é publicado na Vercel a partir deste repositório. A configuração está em `vercel.json`:
a Vercel roda `node scripts/build.js` e publica a pasta `dist`. Não é preciso instalar dependências.

## Estrutura

```
src/            código-fonte (HTML, CSS, JS)
dist/           arquivo final gerado (index.html)
scripts/        build e relatório de precisão
tests/          testes do motor e da interface
docs/           fórmulas, guia de uso, distribuição, testes
planilha/       versão .xlsx e seus scripts (Python + LibreOffice)
demo/           vídeo e guias visuais em PDF
```

## Planilha

`planilha/MapaEletrica-Calc.xlsx` já está pronta. Para gerar de novo: `python3 planilha/gerar_planilha.py`, depois recalcule as fórmulas no LibreOffice (abrir e salvar, ou conversão headless) e rode `python3 planilha/corrigir_links.py planilha/MapaEletrica-Calc.xlsx` para garantir que os links da aba Início levem às abas certas.
