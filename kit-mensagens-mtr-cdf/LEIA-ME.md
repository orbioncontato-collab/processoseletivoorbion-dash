# Kit 30 Mensagens Prontas para MTR, CDF e Pendências Ambientais

## Arquivos finais

| Arquivo | O que é |
| --- | --- |
| `Kit_30_Mensagens_Prontas_MTR_CDF.pdf` | Versão editorial em A4 (41 páginas), pronta para entregar ao comprador. Texto selecionável e pesquisável, links internos clicáveis e marcadores de navegação. |
| `Kit_30_Mensagens_Prontas_MTR_CDF.html` | Versão digital interativa. Arquivo único, funciona sem internet: busca, botão de copiar em cada mensagem e assunto, sumário clicável e botão "Salvar ou imprimir PDF". |

## Copiar para a pasta Downloads

* macOS ou Linux: `bash copiar_para_downloads.sh`
* Windows (PowerShell): `powershell -ExecutionPolicy Bypass -File .\copiar_para_downloads.ps1`

Os scripts localizam a pasta Downloads do usuário e não sobrescrevem arquivos existentes (criam `_2`, `_3`...).

## Gerar novamente (pasta `fonte/`)

Requisitos: Python 3, Node.js e Playwright com Chromium.

```bash
cd fonte
python3 build.py        # monta o HTML a partir de mensagens.py
node gerar_pdf.mjs      # gera o PDF A4 e confere se algum bloco passou do limite da página
node testar_html.mjs    # testa cópia, busca, links, impressão e layout de celular
```

* `mensagens.py`: textos das 30 mensagens, categorias, palavras de busca e mensagens relacionadas.
* `estilo.css`, `app.js`, `ilustracoes.py`: visual, interações e ilustrações vetoriais.
* `otf2ttf.py`: prepara as fontes embutidas (requer `pip install fonttools brotli`). Só é preciso rodar se quiser trocar as fontes.

As fontes usadas são Inter e Inter Display (licença SIL Open Font License), embutidas no HTML e no PDF.
