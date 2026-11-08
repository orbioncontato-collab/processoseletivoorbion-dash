# Mecânica Calc

Plataforma web com as 12 calculadoras de Engenharia Mecânica do kit em Excel.
Cada calculadora mostra o resultado, a memória de cálculo (fórmula, substituição e resultado de cada etapa), uma explicação, um esquema desenhado e as hipóteses do modelo.

Tudo roda no navegador do aluno: não há servidor, cadastro nem banco de dados. Favoritas e histórico ficam no `localStorage`.

## O que tem

- Página inicial com busca, filtro por área e favoritas
- 12 calculadoras com escolha de unidade em cada campo (kN ou N, mm ou m, °C, K ou °F...)
- Validação campo a campo, com mensagens em português
- Números no formato brasileiro (`0,5`, `1.234,5`, `4,7e-6`)
- Casas decimais ajustáveis (2, 4 ou 6)
- Copiar resultado, copiar resolução completa, imprimir ou salvar em PDF
- Histórico dos últimos 20 cálculos e página "Como usar e avisos"
- Layout para computador e celular

## Rodar no computador

```bash
npm install
```

```bash
npm run dev
```

## Publicar

O site é exportado como arquivos estáticos na pasta `out/`.

```bash
npm run build
```

Na Vercel: crie um projeto a partir deste repositório e, em **Root Directory**, escolha `mecanica-calc`. O resto é detectado sozinho.

## Testes

Testes do motor de cálculo (74 verificações, incluindo os mesmos valores de referência da planilha):

```bash
npm test
```

Testes no navegador (44 verificações). Primeiro gere e sirva o site, depois rode o teste:

```bash
npm run build && npx serve out -l 4310
```

```bash
node tests/e2e.mjs http://127.0.0.1:4310
```

## Onde mexer

| Arquivo | O que faz |
|---|---|
| `src/lib/calcs.ts` | Definição das 12 calculadoras: campos, fórmulas, textos e exemplos |
| `src/lib/units.ts` | Unidades e conversões |
| `src/lib/number.ts` | Leitura e exibição de números |
| `src/lib/engine.ts` | Validação e execução do cálculo |
| `src/lib/site.ts` | Nome do site e versão |
| `src/components/Diagram.tsx` | Esquemas desenhados de cada calculadora |
