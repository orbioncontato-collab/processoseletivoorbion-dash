# MapaElétrica Calc em planilha

`MapaEletrica-Calc.xlsx` traz as 12 calculadoras em formato de planilha, para usar no Google Drive (Planilhas Google) ou no Excel.

## Como usar no Google Drive

1. Envie `MapaEletrica-Calc.xlsx` para o Google Drive.
2. Clique com o botão direito no arquivo e escolha **Abrir com > Planilhas Google**.
3. Para guardar como planilha do Google: **Arquivo > Salvar como Planilhas Google**.
4. Se a vírgula decimal não funcionar, vá em **Arquivo > Configurações** e escolha a localidade **Brasil**.

## Como a planilha está organizada

- **Início**: como usar, legenda de cores, escolha das casas decimais (2, 4 ou 6) e links para as abas.
- **12 abas de calculadora**: cada uma tem dados de entrada (células amarelas), situação dos dados, resultados (células verdes), memória de cálculo, explicação e hipóteses. Todas vêm com o exemplo preenchido.
- **Unidades**: tabela de fatores usada pelas fórmulas. Não altere.

Tudo é fórmula: os resultados mudam na hora quando um valor muda. Se algum dado estiver errado, a linha "Situação dos dados" fica vermelha, explica o problema e os resultados ficam em branco. O arredondamento vale só para exibir; a coluna "Valor interno" mostra o número completo.

## Diferenças em relação ao aplicativo HTML

- Sem diagramas, histórico e favoritas (recursos do navegador).
- "Carregar exemplo" vira o exemplo já preenchido, com a coluna "Exemplo" de referência. Para voltar ao exemplo, use uma cópia do arquivo original.
- Imprimir ou PDF pelo próprio Google (Arquivo > Imprimir ou Fazer download > PDF).

## Como gerar e testar de novo

```bash
python3 gerar_planilha.py
```

Depois de recalcular as fórmulas (por exemplo com o LibreOffice), rode a correção de links. Ela garante que os links da aba Início levem para as abas da própria planilha, e não para o navegador:

```bash
python3 corrigir_links.py MapaEletrica-Calc.xlsx
```

```bash
python3 testar_planilha.py MapaEletrica-Calc.xlsx caminho/para/recalc.py
```

O teste muda entradas, recalcula no LibreOffice e confere 29 casos (bateria obrigatória, modos, mensagens de erro e links internos). Última execução: 29 de 29 passaram, 313 fórmulas e nenhum erro de fórmula.
