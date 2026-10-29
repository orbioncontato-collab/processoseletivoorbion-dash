"""Gera testes/RELATORIO_DE_TESTES.md a partir de testes/resultado_testes.json."""
import json
from pathlib import Path

import comum as K

AQUI = Path(__file__).resolve().parent

ITENS = [
    ("Contagem inclusiva dos dias de férias", "Término = início + dias − 1. Cenário P40: 30/12/2026 com 5 dias termina em 03/01/2027. Conferido à mão e pelo modelo em todas as parcelas."),
    ("Transição entre meses e anos", "P40 (dezembro para janeiro), P42 (fevereiro para março de 2028) e PG0009 da demonstração (21/12/2026 a 19/01/2027) no calendário."),
    ("Ano bissexto", "Admissão em 29/02/2024 (T01): aquisitivo 29/02/2024 a 28/02/2025, concessivo até 28/02/2026; período 4 até 28/02/2028 e concessivo até 28/02/2029. Gozo de 25/02/2028 com 10 dias termina em 05/03/2028."),
    ("Datas de admissão em fim de mês", "31/01/2024 (T02), 30/04/2024 (T03) e 31/12/2023 (T04), com término do aquisitivo e do concessivo conferidos à mão."),
    ("Vinculação empresa, vínculo, período e programação", "Somas por ID do período e do vínculo ao mesmo tempo. P46 usa período de outro vínculo e recebe o alerta. Demonstração com mesmo nome (V0001 e V0015) e mesma matrícula 0001 em empresas diferentes."),
    ("Saldos com gozo, reserva e abono", "T05: direito 30, gozo anterior 10, aprovada 14: saldo não gozado 20 e disponível 6 (exemplo do enunciado). T06: abono confirmado 10 e reservado 5."),
    ("Ausência de dupla contagem", "Concluída conta só como gozo confirmado; aprovada só como reserva; abono contado uma vez (T06). Conferido pelo modelo em todos os períodos."),
    ("Cancelamento liberando reserva", "T07: cancelada de 30 dias + nova aprovada de 30 dias: reservado 30, saldo disponível 0, 1 parcela."),
    ("Reagendamento preservando histórico", "P05 aponta para P04 (cancelada). A cancelada continua registrada com o motivo e não ocupa saldo nem calendário."),
    ("Fracionamento avaliado em conjunto", "10+10+10 incompatível (falta 14); 15+15 compatível; 14+4 incompatível (menos de 5); 4 parcelas incompatível; 10 anterior + 14 parcial."),
    ("Aviso e pagamento com prazos distintos", "P01 com início em 09/11/2026: aviso até 10/10/2026 e pagamento até 07/11/2026."),
    ("Pagamento agendado sem confirmação", "P05 Agendado: alerta Agendado para 20/11/2026: confirmar, e conta como pagamento não confirmado no painel."),
    ("Conflitos por sobreposição real", "Equipe com limite 2 e três férias que nunca somam 3 no mesmo dia: sem conflito. Limite 1 com sobreposição: conflito. Mesmo mês sem sobreposição: sem conflito. Solicitada: Conflito se aprovada. Mesma equipe em outra empresa não conta. O modelo confere dia a dia."),
    ("Calendário incompleto", "P37 em 2027 numa localidade sem calendário revisado: Calendário incompleto no retorno e nos alertas."),
    ("Escala pendente", "Escala variável sem descansos cadastrados (PG0008 da demonstração): Conferir escala. Com descanso cadastrado (P33) a vedação é avaliada."),
    ("Vedação de início", "18/11/2026 (feriado em 20/11), quinta-feira com sábado contando na vedação e descanso de escala variável: vedados. Quinta com sábado sem contar: liberado."),
    ("Campos vazios", "P47 sem data de início: Preencher campos essenciais. Linhas vazias sem datas, alertas ou zeros (amostra de cada tabela)."),
    ("Registros duplicados", "P39 com ID repetido e P40/P41 com mesma data e dias: alertas de duplicidade."),
    ("Vínculos desligados", "P38 programada depois do desligamento: Vínculo desligado. Demonstração V0016 desligado e readmitido como V0017."),
    ("Atualização dos indicadores", "Alteração de duas programações para Cancelada na demonstração: saldos e indicadores conferidos de novo contra o modelo."),
    ("Ausência de erros de fórmula", "Varredura de todas as células após recálculo (#NOME?, #VALOR!, #REF!, #DIV/0!, #N/D e equivalentes)."),
    ("Proteção", "Todas as abas protegidas, filtro liberado; amostra de células: entradas desbloqueadas e calculadas bloqueadas."),
    ("Inserção de novas linhas", "Linhas prontas preenchidas com fórmulas até a capacidade; tabelas gravadas com fórmula de coluna calculada (calculatedColumnFormula), que o Excel usa ao estender a tabela. A extensão manual dentro do Excel não foi executada, porque o Excel não está disponível no ambiente."),
    ("Filtros", "Todas as tabelas têm AutoFiltro e a proteção permite usá-lo (conferido no XML). O uso interativo não foi testado no Excel."),
    ("Impressão", "Exportação em PDF pelo LibreOffice: Comece aqui, Painel, Calendário e Ficha em A4 com rodapé numerado. Áreas de impressão dinâmicas das abas de dados não são reconhecidas pelo LibreOffice (ele imprime todas as linhas prontas)."),
    ("Funcionamento com o volume de referência", "Ver seção Volume."),
]


def main():
    r = json.loads((AQUI / "testes" / "resultado_testes.json").read_text(encoding="utf8"))
    L = [f"# Relatório de testes · Planilha Pronta de Controle de Férias {K.VERSAO}", "",
         f"Gerado em {r['gerado_em']}. Motor de cálculo usado na conferência: LibreOffice Calc 24.2 (headless).", "",
         "Gravar fórmulas não prova que elas calculam certo. Por isso cada arquivo foi recalculado no LibreOffice e os resultados "
         "foram lidos e comparados com um modelo independente em Python (`modelo.py`) e com valores escritos à mão (`dados_teste.py`).", "",
         "## Resultados", "",
         "| Conjunto | Erros de fórmula | Comparações com o modelo | Divergências | Outras conferências |", "|---|---|---|---|---|"]
    for k, nome in [("limpa", "Versão limpa"), ("demonstracao", "Demonstração")]:
        x = r[k]
        extra = f"linhas vazias: {x['linhas_vazias']['celulas_conferidas']} células, {x['linhas_vazias']['qtd_falhas']} falhas; proteção: {x['protecao']['celulas_conferidas']} células, {x['protecao']['qtd_falhas']} falhas"
        if "kpis" in x:
            extra += f"; indicadores: {x['kpis']['conferidos']}, falhas {len(x['kpis']['falhas'])}"
        L.append(f"| {nome} | {x['qtd_erros']} | {x['modelo']['comparacoes']} | {x['modelo']['qtd_divergencias']} | {extra} |")
    c = r["cenarios"]
    L.append(f"| Cenários de teste | {c['erros_formula']} | {c['modelo'][0]} | {c['modelo'][1]} | esperados à mão: {c['esperado'][0]} verificações, {c['esperado'][1]} falhas |")
    a = r.get("atualizacao")
    if a:
        L.append(f"| Atualização ({a['alteracao']}) | {a['erros_formula']} | {a['modelo'][0]} | {a['modelo'][1]} | indicadores: {a['kpis'][0]}, falhas {a['kpis'][1]} |")
    v = r.get("volume")
    if v:
        L.append(f"| Volume | {v['erros_formula']} | {v['modelo'][0]} | {v['modelo'][1]} | ver abaixo |")
    if a:
        L += ["", f"Indicadores antes da alteração: {a['kpis_antes']}. Depois: {a['kpis'][3]}."]
    if v:
        L += ["", "## Volume", "",
              f"- {v['vinculos']} vínculos, {v['periodos']} períodos, {v['programacoes']} programações, {v['providencias']} providências, {v['ocorrencias']} ocorrências (dados fictícios).",
              f"- Geração do arquivo: {v['geracao_segundos']} s. Recálculo completo no LibreOffice (abrir, calcular e salvar): {v['recalculo_libreoffice_segundos']} s.",
              f"- Tamanho do arquivo com esse volume: {v['tamanho_mb']} MB.", "- O tempo no Microsoft Excel não foi medido."]
    L += ["", "## Estrutura do arquivo final (demonstração)", ""]
    for a_, b_ in r["demonstracao"]["estrutura"]:
        L.append(f"- {a_}: {b_}")
    L += ["", "## Itens exigidos e como foram testados", ""]
    for a_, b_ in ITENS:
        L.append(f"- **{a_}.** {b_}")
    L += ["", "## Limitações da verificação", "",
          "- O Microsoft Excel não está disponível no ambiente de criação. Abertura, desempenho, impressão e extensão de tabelas no Excel não foram executados.",
          "- O Google Planilhas não foi testado.",
          "- A revisão visual foi feita sobre o PDF exportado pelo LibreOffice. Larguras e quebras de texto podem variar um pouco no Excel.",
          "- Os sites oficiais (planalto.gov.br e camara.leg.br) não abriram no ambiente. As regras foram conferidas em transcrições públicas."]
    (AQUI / "testes" / "RELATORIO_DE_TESTES.md").write_text("\n".join(L) + "\n", encoding="utf8")
    print("relatório ok")


if __name__ == "__main__":
    main()
