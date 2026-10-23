# Kit Pré-MTR · 15 Formulários Prontos para Coletas e Movimentação de Resíduos

## Arquivos finais

| Arquivo | O que é |
| --- | --- |
| `Kit_Pre_MTR_15_Formularios.html` | Versão interativa principal. Arquivo único que funciona sem internet: central de formulários, campos preenchíveis, tabelas com linhas que podem ser adicionadas e removidas, impressão ou PDF de um formulário com os dados digitados, limpeza com confirmação, exportação e importação dos dados em .json. |
| `Kit_Pre_MTR_15_Formularios.xlsx` | Versão em planilha (Excel, LibreOffice ou Google Planilhas). Uma aba por formulário (F01 a F15), com listas suspensas, validação de datas, horários e números, cálculo de diferença no F12 e cada aba já configurada para imprimir em A4. A aba Início traz o índice com links e o andamento do preenchimento de cada formulário. |
| `Kit_Pre_MTR_15_Formularios.pdf` | Kit completo em A4 (24 páginas): capa, apresentação, como utilizar, índice, divisórias, os 15 formulários em branco e as orientações finais. Documento estático, para impressão e arquivamento. |
| `Kit_Pre_MTR_Formularios_Impressao.pdf` | Somente os 15 formulários em branco (16 páginas), para imprimir as folhas de trabalho. |
| `Kit_Pre_MTR_Formularios_Individuais.zip` | Os 15 formulários em arquivos separados (pasta `formularios_individuais/`). |

Os PDFs não têm campos digitais editáveis. Para preencher no computador, use o HTML.

## Copiar para a pasta Downloads

* macOS ou Linux: `bash copiar_para_downloads.sh`
* Windows (PowerShell): `powershell -ExecutionPolicy Bypass -File .\copiar_para_downloads.ps1`

Os scripts criam a pasta `Kit_Pre_MTR_15_Formularios` dentro de Downloads e copiam para ela o HTML, a planilha, os dois PDFs, o LEIA-ME e a pasta `formularios_individuais`. Se a pasta já existir, criam `Kit_Pre_MTR_15_Formularios_2`, `_3`... sem apagar nada.

Outra opção: baixe `Kit_Pre_MTR_15_Formularios.zip` e extraia. Ele já abre como a pasta `Kit_Pre_MTR_15_Formularios`.

## Gerar novamente (pasta `fonte/`)

Requisitos: Python 3, Node.js, Playwright com Chromium e poppler-utils (`pdftotext`, `pdfinfo`).

```bash
cd fonte
python3 build.py         # monta o HTML a partir de formularios.py
node gerar_pdfs.mjs      # gera os PDFs, numera o índice e confere cortes na impressão
node testar.mjs          # testa navegação, campos, tabelas, impressão, limpar, exportar e importar
python3 planilha.py      # gera a versão em planilha (.xlsx)
```

* `formularios.py`: categorias, formulários, blocos e campos.
* `estilo.css`, `app.js`, `ilustracoes.py`: visual, interações e ilustrações vetoriais.
* `paginas.json`: números de página do índice impresso, gravado pelo `gerar_pdfs.mjs`.

As fontes usadas são Inter e Inter Display (licença SIL Open Font License), embutidas no HTML e nos PDFs.
