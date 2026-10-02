# Cartilhas Orbion

## O que é

Sistema que gera cartilhas A5 imprimíveis (44 páginas) a partir de um arquivo JSON.
A primeira cartilha é a Cartilha do Cliente Sumido.
Usa HTML, CSS e JavaScript puro. Não tem build.

## Estrutura de pastas

```
cartilhas/
  index.html                página que monta a cartilha
  main.js                   lê o JSON e define a ordem das páginas
  data/                     textos de cada cartilha (um JSON por cartilha)
  components/               um arquivo JS por tipo de página
  styles/theme.css          cores, fonte e medidas
  styles/pages.css          layout de cada página
  styles/print.css          regras de impressão A5
  assets/                   logo Orbion e fontes Inter
  scripts/exportar-pdf.mjs  gera o PDF e roda as checagens
  dist/                     PDFs e PNGs gerados
```

## Ver no navegador

O JSON é carregado com fetch. Por isso precisa de um servidor local.

```
npx http-server cartilhas
# ou, dentro da pasta cartilhas:
python3 -m http.server
```

Abra o `index.html` no endereço do servidor. Parâmetros de URL:

- `?cartilha=slug` escolhe o arquivo `data/cartilha-slug.json`
- `&sangria=1` adiciona 3 mm de sangria
- `&guias=1` mostra a margem segura na tela

## Como editar as mensagens

Edite `data/cartilha-cliente-sumido.json`. Cada mensagem tem estes campos:

`id`, `categoria`, `tituloSituacao`, `quandoUsar`, `clienteFez`, `naoMandar`, `motivoNaoMandar`, `mensagemPrincipal`, `camposPersonalizaveis`, `objetivo`, `seResponder`, `observacaoOpcional`.

- Texto entre colchetes, como `[Nome]`, vira destaque amarelo.
- `\n\n` separa parágrafos.

Limites para caber em A5. Máximos: `tituloSituacao` 70, `mensagemPrincipal` 300, `quandoUsar` 140, `seResponder` 150, `objetivo` 100 caracteres.

Se não couber, encurte o texto. Não diminua a fonte.

## Como alterar cores

Edite as variáveis do `:root` em `styles/theme.css`: `--ink`, `--brand`, `--go`, `--stop`, `--warn` e as demais.

Regra das cores:

- Verde só para ação recomendada.
- Vermelho só para erro.
- Amarelo só para atenção ou campo a personalizar.

## Como gerar uma nova cartilha

Copie o JSON para `data/cartilha-NOVO.json` e troque os textos. Abra `index.html?cartilha=NOVO` e exporte com `--cartilha=NOVO`.

A ordem das páginas fica na função `plan()` do `main.js`.
Se mudar a quantidade de páginas ou mensagens, adicione ao JSON o bloco opcional `"checagens": {"paginas": N, "mensagens": M}`. O script usa esses valores.

## Como exportar e imprimir em PDF

```
node cartilhas/scripts/exportar-pdf.mjs
```

Precisa do playwright com Chromium: `npm i -D playwright && npx playwright install chromium`.

Flags:

- `--sangria` gera a versão para gráfica (3 mm)
- `--png` salva uma imagem por página em `dist/png`
- `--cartilha=slug` escolhe a cartilha

O script confere 44 páginas, 27 mensagens, numeração, duplicadas, overflow e margem segura, formato A5, promessa da capa, palavras proibidas e travessão. Se algo falhar, sai com erro.

Alternativa manual: botão "Imprimir / salvar PDF" no Chrome. Use papel A5, margens nenhuma e gráficos de fundo ligados.

## Arquivos finais

- `dist/cartilha-cliente-sumido.pdf` para uso digital ou impressão comum
- `dist/cartilha-cliente-sumido-sangria.pdf` para gráfica (154 x 216 mm, com 3 mm de sangria)

## Créditos

- Fonte Inter (licença OFL em `assets/fonts/LICENSE-Inter.txt`)
- Logo Orbion de `public/orbion-logo.png`
