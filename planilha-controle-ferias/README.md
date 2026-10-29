# Planilha Pronta de Controle de Férias

Bônus do produto **160 Mapas Visuais de Departamento Pessoal**.

## Arquivos para download (pasta `entregaveis/`)

| Arquivo | Conteúdo |
|---|---|
| `Controle_de_Ferias.xlsx` | Versão limpa, pronta para cadastro |
| `Controle_de_Ferias_Demonstracao.xlsx` | Versão com 18 vínculos fictícios e todos os alertas em funcionamento |
| `Guia_Rapido_Controle_de_Ferias.pdf` | Guia visual de preenchimento e uso |
| `Leia-me.txt` | Versão, compatibilidade testada, capacidade, limitações, senha e cópia de segurança |

## Código-fonte (pasta `codigo-fonte/`)

A planilha é gerada por código, para que qualquer ajuste possa ser refeito sem perder fórmulas.

| Arquivo | Função |
|---|---|
| `comum.py` | Constantes (versão, datas, capacidade, cores) e utilitários de fórmula |
| `tabelas.py` | Colunas e fórmulas de cada tabela |
| `construir.py` | Monta o .xlsx (abas, tabelas, validações, cores, proteção, impressão, painel, calendário, ficha) |
| `textos.py` | Textos da aba Comece aqui, cartões do painel e regras de referência |
| `dados.py` | Conteúdo da versão limpa e da demonstração |
| `dados_teste.py` | Cenários de teste com resultados esperados escritos à mão |
| `dados_volume.py` | Massa fictícia de 500 vínculos para o teste de volume |
| `modelo.py` | Modelo independente em Python das regras, usado na conferência |
| `recalcular.py`, `leitura.py`, `verificar.py` | Recálculo pelo LibreOffice, leitura e comparação dos resultados |
| `gerar_tudo.py` | Gera as planilhas finais e roda todos os testes |
| `gerar_leiame.py`, `gerar_relatorio.py` | Geram o Leia-me e o relatório de testes |
| `guia/` | HTML do guia e script que gera o PDF |
| `testes/` | Resultado dos testes (`resultado_testes.json`, `RELATORIO_DE_TESTES.md`) |

### Como reproduzir

Requisitos: Python 3.10 ou superior, `xlsxwriter`, `openpyxl`, `Pillow`, `playwright` (com Chromium) e LibreOffice (`soffice` no PATH), além de `pdftoppm`/`pdftotext` (poppler).

```bash
cd codigo-fonte
```

```bash
python3 gerar_tudo.py
```

```bash
python3 gerar_leiame.py && python3 gerar_relatorio.py && python3 guia/gerar_guia.py
```

`gerar_tudo.py --rapido` pula o teste de volume e reaproveita o último resultado dele.
