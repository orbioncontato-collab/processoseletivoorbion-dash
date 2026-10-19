# Resultado dos testes

95 de 95 verificações aprovadas.

### t01_vazia
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Cards do painel zerados: [0, 0, 0, 0, 0, 0]
- [OK] Indicadores complementares zerados: [0, 0, 0, 0, 0, 0]
- [OK] Gráfico de situação sem dados
- [OK] Central de pendências vazia
- [OK] Mensagem de ausência de pendências
- [OK] 46 links internos, todos apontando para abas existentes
- [OK] Aba INÍCIO com 6 botões + 5 atalhos de passos (11 links)
- [OK] 13 abas: ['INÍCIO', 'PAINEL', 'MTRs', 'ITENS_MTR', 'RECEBIMENTOS', 'CDFs', 'VÍNCULOS_CDF', 'PENDÊNCIAS', 'RELATÓRIOS', 'CAD_UNIDADES', 'CAD_PARCEIROS', 'CAD_RESÍDUOS', 'CONFIGURAÇÕES']

### t02_mtr_simples
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] 1 MTR contabilizado (card 01 = 1)
- [OK] Quantidade movimentada = 500 kg (500)
- [OK] Situação: Aguardando recebimento
- [OK] Card aguardando recebimento = 1, confirmado = 0 (1, 0)
- [OK] Pendência: [('MTR-000001', 'RECEBIMENTO NÃO CONFIRMADO', 'Alta')]

### t03_varios_residuos
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Um único MTR (card 01 = 1)
- [OK] Dois itens (2)
- [OK] Total do MTR = 2.000 kg (2000)
- [OK] 1,2 t convertido para 1.200 kg (1200)
- [OK] Painel: 2.000 kg movimentados (2000)

### t04_recebimento_conferido
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] MTR 1 com recebimento conferido: Aguardando CDF
- [OK] CDF não considerado localizado (0 kg vinculado)
- [OK] Card recebimento confirmado = 1 (1)
- [OK] Card aguardando CDF = 1 (1)
- [OK] MTR 2 marcado Sim sem evidência não confirma: Informação a revisar
- [OK] Alerta: Conferido sem evidência identificada

### t05_um_cdf_dois_mtrs
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Um CDF cadastrado (1)
- [OK] Dois MTRs relacionados ao CDF (2)
- [OK] CDF com 800 kg vinculados (800)
- [OK] MTR A = 500 kg, MTR B = 300 kg
- [OK] Painel: 800 kg vinculados a CDF, sem duplicar (800)
- [OK] 2 MTRs com documentação conferida ([2, 0, 2, 0, 2, 0])

### t06_cobertura_parcial
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Cobertura registrada 600 kg (600)
- [OK] Diferença a investigar 400 kg (400)
- [OK] Cobertura 60% (0.6)
- [OK] Situação: Vínculo de CDF parcial
- [OK] Nenhuma conclusão integral (card documentação conferida = 0)

### t07_cdf_nao_conferido
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] CDF: Localizado, aguardando conferência
- [OK] MTR: CDF localizado, a conferir
- [OK] Nenhuma conferência concluída reconhecida
- [OK] Pendência: [('MTR-000001', 'CDF A CONFERIR', 'Alta')]

### t08_duplicidade
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Mesmo número, sistema, UF e unidade: alerta nos dois registros
- [OK] Mesmo número em outro sistema ou outra unidade: sem alerta
- [OK] Situação: Informação a revisar

### t09_cancelado
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Situação: Cancelado (informado)
- [OK] Histórico preservado (registro continua na aba)
- [OK] Card 01 inclui o cancelado (2); card 02 só o ativo (1): [2, 1, 0, 0, 0, 0]
- [OK] Quantidade movimentada exclui o cancelado: 300 kg (300)
- [OK] Cancelado fora da central de pendências
- [OK] Gráfico mostra o cancelado em fatia própria

### t10_diferenca_pesagem
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Diferença de 20 kg (20)
- [OK] Item: Quantidade a revisar
- [OK] Pendência: QUANTIDADE A REVISAR
- [OK] Sinaliza conferência, sem falar em infração
- [OK] Com DIFERENÇA ANALISADA? = Sim o MTR segue o fluxo: Aguardando CDF

### t11_referencia_inexistente
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Item com MTR inexistente: MTR inexistente
- [OK] Total do MTR válido não muda: 500
- [OK] Item inexistente (referência inválida)
- [OK] REVISAR VÍNCULO: item inexistente
- [OK] REVISAR VÍNCULO: CDF inexistente
- [OK] CDF: Necessita revisão de vínculos
- [OK] MTR não aparece como concluído: Informação a revisar
- [OK] Nenhuma situação falsa de conclusão
- [OK] Central mostra referências inválidas: Registros sem referência válida (não entram na lista abaixo): itens sem MTR válido 1 | recebimentos 1 | víncul

### t12_filtros_sem_filtro
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] 4 MTRs (MTR com 3 itens contado uma vez): 4
- [OK] Gráfico de situação soma 4 ({'Cadastro incompleto': 0, 'Informação a revisar': 0, 'Aguardando recebimento': 3, 'Aguardando CDF': 0, 'Vínculo de CDF parcial': 0, 'CDF localizado, a conferir': 1, 'Documentação conferida': 0, 'Cancelado (informado)': 0})
- [OK] Total 1.880 kg (1880)
- [OK] Relatório 01: jul=1, ago=2, set=1 MTRs
- [OK] Relatório 01: ago = 1.400 kg (['ago/26', 'Todas', 2, 1400, 0, 2, 0, 0, None])
- [OK] Relatório 02 por resíduo: A=1.150 kg, B=730 kg
- [OK] Relatório 03: 1 recebimento ([['MTR-000003', '0003', 'Destinadora Teste 1', datetime.datetime(2026, 8, 25, 0, 0), 400, 'Conferido', 'REC-000001', None, None]])
- [OK] Relatório 04: [['Destinadora Teste 1', 'C-1', 'CDF-000001', datetime.datetime(2026, 9, 1, 0, 0), 400, 1, 'Localizado, aguardando conferência', None, None]]
- [OK] Relatório 05: 4 pendências (['RECEBIMENTO NÃO CONFIRMADO', 'RECEBIMENTO NÃO CONFIRMADO', 'CDF A CONFERIR', 'RECEBIMENTO NÃO CONFIRMADO'])
- [OK] Relatório 06: 4 MTRs, MTR-000004 com 3 itens e 180 kg
- [OK] Gráfico mensal: {'out/25': 0, 'nov/25': 0, 'dez/25': 0, 'jan/26': 0, 'fev/26': 0, 'mar/26': 0, 'abr/26': 0, 'mai/26': 0, 'jun/26': 0, 'jul/26': 300, 'ago/26': 1400, 'set/26': 180}
- [OK] Gráfico resíduos: [('Resíduo Teste A', 1150), ('Resíduo Teste B', 730)]
- [OK] Gráfico destinadores: [('Destinadora Teste 1', 2), ('Destinadora Teste 2', 2)]

### t12_filtros_unidade_periodo
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Filtro Unidade B + agosto: 1 MTR (1)
- [OK] 400 kg no filtro (400)
- [OK] Relatório 01 com unidade A: jul=1, ago=1, set=0
- [OK] Relatório 06 filtrado: ['MTR-000001', 'MTR-000002']

### t12_filtros_residuo
- [OK] Recalculo sem erros de fórmula (128396 fórmulas, 0 erros)
- [OK] Filtro resíduo B: 3 MTRs (3)
- [OK] Só a quantidade do resíduo B: 730 kg (730)

