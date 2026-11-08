# Kit de 12 Calculadoras Automáticas de Engenharia Mecânica

Arquivo pronto: `Kit_12_Calculadoras_Engenharia_Mecanica.xlsx`

15 abas: INICIO, COMO_USAR, 12 calculadoras (01_FORCAS a 12_CONDUCAO) e TESTES.
Sem macros, sem VBA, sem links externos. Funciona offline no Excel.

## Arquivos desta pasta

| Arquivo | Para que serve |
|---|---|
| `Kit_12_Calculadoras_Engenharia_Mecanica.xlsx` | O produto final |
| `gerar_kit.py` | Cria o XLSX do zero com openpyxl (fórmulas, layout, validações, links) |
| `finalizar.py` | Gera o XLSX, recalcula uma cópia no LibreOffice e grava os valores calculados ao lado das fórmulas |
| `testes_qa.py` | Roda 139 verificações funcionais no LibreOffice (campos vazios, zero, texto, negativos, troca de modo, opcionais, extremos, links) |

## Como gerar de novo

Só o openpyxl é obrigatório para criar o arquivo:

```bash
python gerar_kit.py .
```

Para o arquivo final com valores já calculados e para os testes, é preciso ter o LibreOffice e o script `recalc.py` (da skill de planilhas):

```bash
python finalizar.py /caminho/para/recalc.py .
```

```bash
python testes_qa.py /caminho/para/recalc.py
```
