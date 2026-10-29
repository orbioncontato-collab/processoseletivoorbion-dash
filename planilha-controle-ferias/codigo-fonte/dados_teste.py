"""Cenários de teste com resultados esperados escritos à mão (conferidos também pelo modelo.py)."""
import datetime as dt
import dados

D = dt.date
REF = D(2026, 10, 15)


def dataset():
    d = {"demo": False, "params": {"data_manual": REF, "alerta1": 90, "alerta2": 60, "alerta3": 30},
         "T_TiposOc": dados.tipos_oc(), "ficha_vinculo": "T05",
         "calendario": {"mes": "Dezembro", "ano": 2026, "empresa": "E1", "equipe": "B"}}
    d["T_Empresas"] = [{"ID da empresa": "E1", "Nome da empresa": "Empresa teste 1"}, {"ID da empresa": "E2", "Nome da empresa": "Empresa teste 2"}]
    d["T_Local"] = [{"Código da localidade": "L1", "Município": "Cidade 1", "UF": "SP"},
                    {"Código da localidade": "L2", "Município": "Cidade 2", "UF": "RJ"}]
    d["T_Equipes"] = [{"Equipe": "A", "ID da empresa": "E1", "Limite interno de ausências simultâneas": 2},
                      {"Equipe": "B", "ID da empresa": "E1", "Limite interno de ausências simultâneas": 1},
                      {"Equipe": "C", "ID da empresa": "E1"},
                      {"Equipe": "A", "ID da empresa": "E2", "Limite interno de ausências simultâneas": 1}]
    d["T_Escalas"] = [{"Código da escala": "DOM", "Tipo": "Fixa", "Dia do DSR": "Domingo"},
                      {"Código da escala": "SABCONTA", "Tipo": "Fixa", "Dia do DSR": "Domingo", "Folga adicional fixa": "Sábado",
                       "Folga adicional conta na vedação": "Sim"},
                      {"Código da escala": "SAB", "Tipo": "Fixa", "Dia do DSR": "Domingo", "Folga adicional fixa": "Sábado",
                       "Folga adicional conta na vedação": "Não"},
                      {"Código da escala": "VAR", "Tipo": "Variável"}]
    fer = dados.feriados_nacionais([2026, 2027, 2028])
    fer += [{"Data": D(2026, 11, 25), "Descrição": "Municipal teste L1", "Abrangência": "Municipal", "Código da localidade": "L1"},
            {"Data": D(2026, 11, 24), "Descrição": "Estadual teste RJ", "Abrangência": "Estadual", "UF": "RJ"}]
    d["T_Feriados"] = fer
    d["T_CalRev"] = [{"Ano": 2026, "Código da localidade": "L1", "Calendário revisado": "Sim"},
                     {"Ano": 2027, "Código da localidade": "L1", "Calendário revisado": "Sim"},
                     {"Ano": 2028, "Código da localidade": "L1", "Calendário revisado": "Sim"},
                     {"Ano": 2026, "Código da localidade": "L2", "Calendário revisado": "Sim"}]
    d["T_Desc"] = [{"ID do vínculo": "T14", "Data de descanso": D(2026, 11, 10)},
                   {"ID do vínculo": "T14", "Data de descanso": D(2026, 11, 22)},
                   {"ID do vínculo": "T14", "Data de descanso": D(2026, 11, 27)}]

    def V(i, adm, emp="E1", eq="A", loc="L1", esc="DOM", sit="Ativo", desl=None, reg="CLT regra geral"):
        return {"ID do vínculo": i, "ID da empresa": emp, "Nome": "Pessoa " + i, "Data de admissão": adm, "Equipe": eq,
                "Localidade de trabalho": loc, "Escala ou jornada": esc, "Regime contratual": reg, "Situação do vínculo": sit,
                "Data de desligamento": desl, "Matrícula": i}
    d["T_Func"] = [V("T01", D(2024, 2, 29)), V("T02", D(2024, 1, 31)), V("T03", D(2024, 4, 30)), V("T04", D(2023, 12, 31)),
                   V("T05", D(2025, 3, 1), eq="C"), V("T06", D(2025, 1, 10), eq="C"), V("T07", D(2025, 1, 10), eq="C"), V("T08", D(2025, 1, 10), eq="C"),
                   V("T09", D(2025, 1, 10), eq="C"), V("T10", D(2025, 1, 10), eq="C"), V("T11", D(2025, 1, 10), eq="C"),
                   V("T12", D(2025, 1, 10), eq="C"),
                   V("X", D(2025, 1, 10)), V("Y", D(2025, 1, 10)), V("Z", D(2025, 1, 10)),
                   V("W", D(2025, 1, 10), eq="B"), V("Q", D(2025, 1, 10), eq="B"), V("R", D(2025, 1, 10), eq="B"),
                   V("S", D(2025, 1, 10), eq="B"), V("SOL", D(2025, 1, 10), eq="B"), V("OUT", D(2025, 1, 10), emp="E2", eq="A"),
                   V("T14", D(2025, 1, 10), eq="C", esc="VAR"), V("T14B", D(2025, 1, 10), eq="C", esc="SABCONTA"),
                   V("T14C", D(2025, 1, 10), eq="C", esc="SAB"),
                   V("T15", D(2025, 1, 10), eq="C", loc="L2"), V("T16", D(2025, 1, 10), eq="C", sit="Desligado", desl=D(2026, 9, 30)),
                   V("T17", D(2025, 1, 10), eq="C"), V("T18", D(2025, 1, 10), eq="C"), V("T19", D(2025, 1, 10), eq="C"),
                   V("T24", D(2025, 1, 10), eq="C"), V("T25", D(2025, 1, 10), eq="C", reg="Intermitente")]

    def P(v, n, faltas=0, **kw):
        r = {"ID do vínculo": v, "Nº do período": n, "Faltas injustificadas conferidas": faltas, "Situação da apuração do direito": "Conferido"}
        r.update(kw)
        return r
    pers = [P("T01", 1), P("T01", 2), P("T01", 3), P("T01", 4), P("T02", 1), P("T03", 1), P("T04", 1),
            P("T05", 1, **{"Gozo anterior à planilha": 10, "Parcelas anteriores à planilha": 1, "Maior parcela anterior": 10})]
    pers += [P(v, 1) for v in ["T06", "T07", "T08", "T09", "T10", "T11", "X", "Y", "Z", "W", "Q", "R", "S", "SOL", "OUT",
                               "T14", "T14B", "T14C", "T15", "T16", "T17", "T18", "T19", "T24", "T25"]]
    pers += [P("T12", 1, 30)]
    pers += [P("T19", 2)]
    d["T_Per"] = pers

    def G(i, v, n, sit, ini, dias, **kw):
        r = {"ID da programação": i, "ID do vínculo": v, "ID do período": f"{v}-P{n}", "Situação da programação": sit,
             "Data de início": ini, "Dias de gozo": dias, "Concordância com fracionamento": "Sim", "Data da aprovação": D(2026, 9, 1)}
        r.update(kw)
        return r
    A, C_, S_, CAN, GZ, RA = "Aprovada", "Concluída", "Solicitada", "Cancelada", "Em gozo", "Rascunho"
    d["T_Prog"] = [
        G("P01", "T05", 1, A, D(2026, 11, 9), 14),
        G("P02", "T06", 1, C_, D(2026, 7, 6), 20, **{"Dias de abono": 10, "Situação do abono": "Confirmado", "Data da solicitação do abono": D(2025, 12, 1)}),
        G("P03", "T06", 1, A, D(2026, 12, 7), 5, **{"Dias de abono": 5, "Situação do abono": "Solicitado", "Data da solicitação do abono": D(2026, 9, 1)}),
        G("P04", "T07", 1, CAN, D(2026, 8, 3), 30, **{"Motivo de cancelamento ou reagendamento": "Reagendada"}),
        G("P05", "T07", 1, A, D(2026, 11, 23), 30, **{"Programação anterior relacionada": "P04"}),
        G("P06", "T08", 1, A, D(2026, 11, 3), 10), G("P07", "T08", 1, A, D(2026, 11, 17), 10), G("P08", "T08", 1, A, D(2026, 12, 1), 10),
        G("P09", "T09", 1, A, D(2026, 11, 3), 15), G("P10", "T09", 1, A, D(2026, 12, 1), 15),
        G("P11", "T10", 1, A, D(2026, 11, 3), 14), G("P12", "T10", 1, A, D(2026, 12, 1), 4),
        G("P13", "T11", 1, A, D(2026, 11, 3), 14), G("P14", "T11", 1, A, D(2026, 11, 24), 5), G("P15", "T11", 1, A, D(2026, 12, 8), 5),
        G("P16", "T11", 1, A, D(2026, 12, 15), 6),
        G("P17", "T12", 1, A, D(2026, 11, 3), 12),
        G("P20", "X", 1, A, D(2026, 12, 1), 10), G("P21", "Y", 1, A, D(2026, 12, 1), 3), G("P22", "Z", 1, A, D(2026, 12, 8), 3),
        G("P23", "W", 1, A, D(2026, 12, 1), 10), G("P24", "Q", 1, A, D(2026, 12, 8), 3),
        G("P25", "R", 1, A, D(2027, 3, 1), 5), G("P26", "S", 1, A, D(2027, 3, 15), 6),
        G("P27", "SOL", 1, S_, D(2026, 12, 9), 5), G("P28", "OUT", 1, A, D(2026, 12, 1), 10),
        G("P30", "T17", 1, A, D(2026, 11, 18), 10), G("P31", "T17", 1, CAN, D(2026, 11, 6), 10),
        G("P32", "T18", 1, A, D(2026, 11, 5), 25),
        G("P33", "T14", 1, A, D(2026, 11, 9), 10), G("P34", "T14", 1, RA, D(2026, 11, 30), 10),
        G("P35", "T14B", 1, A, D(2026, 11, 5), 15), G("P36", "T14C", 1, A, D(2026, 11, 5), 15),
        G("P37", "T15", 1, A, D(2027, 1, 5), 15), G("P38", "T16", 1, A, D(2026, 11, 3), 15),
        G("P39", "T18", 1, A, D(2026, 11, 26), 15), G("P39", "T18", 1, RA, D(2027, 1, 4), 15),
        G("P40", "T19", 1, A, D(2026, 12, 30), 5), G("P41", "T19", 1, A, D(2026, 12, 30), 5),
        G("P42", "T01", 4, RA, D(2028, 2, 25), 10),
        G("P43", "T24", 1, GZ, D(2026, 9, 1), 15), G("P44", "T24", 1, A, D(2026, 10, 13), 10),
        G("P45", "T25", 1, A, D(2026, 11, 3), 10),
        G("P46", "T09", 1, A, D(2027, 2, 1), 5, **{"ID do período": "T08-P1"}),
        G("P47", "T12", 1, A, None, 10),
    ]
    d["T_Prov"] = [{"ID da programação": "P05", "Situação do pagamento": "Agendado", "Data agendada": D(2026, 11, 20)},
                   {"ID da programação": "P01", "Data de entrega do aviso": D(2026, 10, 1), "Data da ciência do empregado": D(2026, 10, 1),
                    "Conteúdo do aviso conferido": "Sim", "Situação do pagamento": "Confirmado", "Data do pagamento realizado": D(2026, 11, 5),
                    "Data da confirmação do pagamento": D(2026, 11, 5)},
                   {"ID da programação": "P09", "Data de entrega do aviso": D(2026, 10, 1), "Situação do pagamento": "Realizado",
                    "Data do pagamento realizado": D(2026, 10, 30), "Evidência do aviso": "link"}]
    d["T_Oc"] = [{"ID da ocorrência": "O1", "ID do vínculo": "T17", "Tipo": "Licença-paternidade", "Início": D(2026, 11, 20),
                  "Término": D(2026, 11, 24), "Análise necessária": "Não", "Situação da análise": "Concluída",
                  "Efeito confirmado": "Sem efeito no direito", "Responsável": "R", "Data da conclusão": D(2026, 11, 1)}]
    return d


# Resultados esperados escritos à mão: (tabela, chave, coluna) -> valor
ESPERADO = {
    ("T_Per", "T01-P1", "Início do aquisitivo"): D(2024, 2, 29),
    ("T_Per", "T01-P1", "Término do aquisitivo"): D(2025, 2, 28),
    ("T_Per", "T01-P1", "Início do concessivo"): D(2025, 3, 1),
    ("T_Per", "T01-P1", "Término do concessivo"): D(2026, 2, 28),
    ("T_Per", "T01-P2", "Início do aquisitivo"): D(2025, 3, 1),
    ("T_Per", "T01-P4", "Término do aquisitivo"): D(2028, 2, 28),
    ("T_Per", "T01-P4", "Término do concessivo"): D(2029, 2, 28),
    ("T_Per", "T02-P1", "Término do aquisitivo"): D(2025, 1, 30),
    ("T_Per", "T02-P1", "Término do concessivo"): D(2026, 1, 30),
    ("T_Per", "T03-P1", "Término do aquisitivo"): D(2025, 4, 29),
    ("T_Per", "T04-P1", "Término do aquisitivo"): D(2024, 12, 30),
    ("T_Per", "T04-P1", "Término do concessivo"): D(2025, 12, 30),
    ("T_Per", "T05-P1", "Gozo confirmado"): 10, ("T_Per", "T05-P1", "Gozo reservado"): 14,
    ("T_Per", "T05-P1", "Saldo não gozado"): 20, ("T_Per", "T05-P1", "Saldo disponível"): 6,
    ("T_Per", "T06-P1", "Abono confirmado"): 10, ("T_Per", "T06-P1", "Abono reservado"): 5,
    ("T_Per", "T07-P1", "Saldo disponível"): 0, ("T_Per", "T07-P1", "Gozo reservado"): 30, ("T_Per", "T07-P1", "Quantidade de parcelas"): 1,
    ("T_Per", "T08-P1", "Avaliação do fracionamento"): "Falta parcela de 14 dias ou mais",
    ("T_Per", "T09-P1", "Avaliação do fracionamento"): "Fracionamento compatível",
    ("T_Per", "T10-P1", "Avaliação do fracionamento"): "Parcela com menos de 5 dias",
    ("T_Per", "T11-P1", "Avaliação do fracionamento"): "Mais de 3 parcelas",
    ("T_Per", "T12-P1", "Dias de direito"): 12, ("T_Per", "T12-P1", "Avaliação do fracionamento"): "Parcela única",
    ("T_Per", "T05-P1", "Avaliação do fracionamento"): "Parcial: saldo restante a programar",
    ("T_Per", "T25-P1", "Situação do período"): "Análise específica (regime)",
    ("T_Prog", "P40", "Término"): D(2027, 1, 3),
    ("T_Prog", "P42", "Término"): D(2028, 3, 5),
    ("T_Prog", "P01", "Prazo legal do aviso"): D(2026, 10, 10),
    ("T_Prog", "P01", "Prazo legal do pagamento"): D(2026, 11, 7),
    ("T_Prog", "P20", "Conflito de equipe"): "Dentro do limite interno",
    ("T_Prog", "P21", "Conflito de equipe"): "Dentro do limite interno",
    ("T_Prog", "P22", "Conflito de equipe"): "Dentro do limite interno",
    ("T_Prog", "P23", "Conflito de equipe"): "Acima do limite interno (1)",
    ("T_Prog", "P24", "Conflito de equipe"): "Acima do limite interno (1)",
    ("T_Prog", "P25", "Conflito de equipe"): "Dentro do limite interno",
    ("T_Prog", "P26", "Conflito de equipe"): "Dentro do limite interno",
    ("T_Prog", "P27", "Conflito de equipe"): "Conflito se aprovada (limite 1)",
    ("T_Prog", "P28", "Conflito de equipe"): "Dentro do limite interno",
    ("T_Prog", "P06", "Conflito de equipe"): "Limite não definido",
    ("T_Prog", "P05", "Pagamento"): "Agendado para 20/11/2026: confirmar",
    ("T_Prog", "P09", "Pagamento"): "Realizado: confirmar o pagamento",
    ("T_Prog", "P09", "Aviso"): "Registrar ciência do empregado",
    ("T_Prog", "P01", "Pagamento"): "Pagamento confirmado",
    ("T_Prog", "P04", "Validação do conjunto"): "Cancelada: não reserva nem consome",
    ("T_Prog", "P37", "Retorno previsto segundo escala"): "Calendário incompleto",
    ("T_Prog", "P35", "Retorno previsto segundo escala"): "Conferir escala (feriado no retorno)",
    ("T_Prog", "P36", "Retorno previsto segundo escala"): "Conferir escala (feriado no retorno)",
    ("T_Prog", "P20", "Retorno previsto segundo escala"): D(2026, 12, 11),
    ("T_Prog", "P43", "Próxima ação"): "Confirmar o retorno e marcar Concluída",
    ("T_Prog", "P44", "Próxima ação"): "Atualizar a situação para Em gozo",
    ("T_Prog", "P25", "Retorno previsto segundo escala"): D(2027, 3, 6),
}

# Trechos que devem aparecer (ou não) nos alertas da parcela
ALERTA_CONTEM = {
    "P03": ["Abono acima de 1/3 do direito", "Abono em mais de uma programação do período"],
    "P12": ["Fracionamento: Parcela com menos de 5 dias"],
    "P30": ["Início vedado"],              # 18/11: 20/11 é feriado nacional
    "P31": [],                             # cancelada: não acusa vedação
    "P32": ["Sobreposição com outra parcela"],
    "P39": ["ID da programação repetido"],
    "P33": ["Início vedado"],              # escala variável com descanso em 10/11
    "P34": [],                             # rascunho 30/11: descanso 27/11 cobre a escala, sem vedação
    "P35": ["Início vedado"],              # 5/11 quinta: sábado conta na vedação
    "P36": [],                             # 5/11 quinta: sábado não conta
    "P37": ["Calendário incompleto"],
    "P38": ["Vínculo desligado"],
    "P40": ["Programação duplicada"],
    "P41": ["Programação duplicada"],
    "P45": ["Análise específica (regime)"],
    "P46": ["Período de outro vínculo"],
    "P47": ["Preencher campos essenciais"],
}
ALERTA_NAO_CONTEM = {
    "P31": ["Início vedado"], "P36": ["Início vedado"], "P34": ["Início vedado", "Conferir escala"],
    "P20": ["Conflito"], "P09": ["Fracionamento"],
}
