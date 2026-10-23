# Como gerar novamente o Kit de 10 Relatórios

Requisitos: Python 3, Node.js, Playwright com Chromium e poppler-utils (`pdftotext`, `pdfinfo`).

```bash
cd fonte
python3 build.py        # monta o HTML a partir de relatorios.py
node gerar_pdfs.mjs     # gera o PDF completo, os 10 PDFs individuais e o ZIP de entrega
node testar.mjs         # testa campos, tabelas, indicadores, gráficos, logotipo, impressão, limpar, exportar e importar
```

* `relatorios.py`: os 10 relatórios, com seções, tabelas, indicadores, gráficos e textos-base.
* `estilo.css`, `app.js`, `ilustracoes.py`: visual, cálculos, gráficos SVG e ilustrações.
* `paginas.json`: números de página do índice impresso, gravado pelo `gerar_pdfs.mjs`.

Copiar para a pasta Downloads (cria `Downloads/Kit_10_Relatorios_Gestao_Residuos`, sem sobrescrever):

* macOS ou Linux: `bash ../copiar_para_downloads.sh`
* Windows: `powershell -ExecutionPolicy Bypass -File ..\copiar_para_downloads.ps1`

As fontes usadas são Inter e Inter Display (licença SIL Open Font License), embutidas no HTML e nos PDFs.
