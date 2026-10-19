# Bônus 02 | Planilha Pronta de Controle de MTR e CDF

## Arquivos para o comprador

| Arquivo | Para que serve |
|---|---|
| `Bonus02_Planilha_Controle_MTR_CDF.xlsx` | Planilha limpa, pronta para uso. Nenhum registro preenchido. |
| `Bonus02_Planilha_MTR_CDF_Exemplo.xlsx` | Mesma planilha preenchida com dados fictícios, para o comprador ver tudo funcionando. |

## Abas

INÍCIO, PAINEL, MTRs, ITENS_MTR, RECEBIMENTOS, CDFs, VÍNCULOS_CDF, PENDÊNCIAS, RELATÓRIOS,
CAD_UNIDADES, CAD_PARCEIROS, CAD_RESÍDUOS, CONFIGURAÇÕES.

## Requisitos

- Excel 365 ou Excel 2019 em diante (a planilha usa MÁXIMOSES).
- Sem macros, sem VBA, sem internet.
- Google Sheets não foi testado.

## Capacidade pronta

500 MTRs, 1.000 itens, 1.000 recebimentos, 500 CDFs, 1.000 vínculos, 100 unidades, 200 parceiros e 200 resíduos.
Para volumes maiores, o caminho mais simples é usar um arquivo por ano.

## Como regerar os arquivos

```bash
python finalizar.py <pasta_de_saida>   # gera as duas versões com os valores já calculados
python testes.py <pasta_de_trabalho>   # roda os 12 cenários de teste
```

Os dois scripts precisam de Python 3 com openpyxl e lxml, e do LibreOffice instalado (usado para recalcular).

## O que foi testado

Os 12 cenários do briefing foram executados com dados fictícios e recalculados no LibreOffice 24.2.
Resultado em `RESULTADO_TESTES.md` (95 de 95 verificações aprovadas).
Os arquivos também passaram na validação do schema oficial do formato XLSX.
Os testes não foram feitos em uma instalação real do Microsoft Excel.
