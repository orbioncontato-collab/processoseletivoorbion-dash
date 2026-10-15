# Kit de 6 Calculadoras Automáticas de Engenharia Ambiental

Arquivo pronto: `KIT_6_CALCULADORAS_ENGENHARIA_AMBIENTAL.xlsx` (Excel e Google Planilhas, sem macros).

## Abrir no Google Planilhas
1. Envie o `.xlsx` para o Google Drive.
2. Clique com o botão direito > Abrir com > Planilhas Google.
3. Arquivo > Salvar como Planilhas Google.

## Como o arquivo é gerado e testado
- `specs.py`: entradas, exemplos, fórmulas, validações e textos das 6 calculadoras.
- `gerar_kit.py`: monta as 9 abas (painel, guia, calculadoras e biblioteca).
- `testar_kit.py`: cria variações (exemplos, campos vazios, zero, negativos, texto, troca de unidades),
  recalcula no LibreOffice e confere os resultados.
- `finalizar.py`: roda tudo, ajusta as alturas das linhas e grava os valores calculados no arquivo final.

```
python finalizar.py /tmp/kit KIT_6_CALCULADORAS_ENGENHARIA_AMBIENTAL.xlsx
```
