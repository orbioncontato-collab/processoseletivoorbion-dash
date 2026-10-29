"""Conteúdo das versões limpa e demonstrativa."""
import datetime as dt

D = dt.date

FONTE_NAC = "Lei 662/1949 (red. Lei 10.607/2002)"


def feriados_nacionais(anos):
    out = []
    for y in anos:
        for m, d, nome, fonte in [(1, 1, "Confraternização Universal", FONTE_NAC), (4, 21, "Tiradentes", FONTE_NAC),
                                  (5, 1, "Dia do Trabalho", FONTE_NAC), (9, 7, "Independência do Brasil", FONTE_NAC),
                                  (10, 12, "Nossa Senhora Aparecida", "Lei 6.802/1980"), (11, 2, "Finados", FONTE_NAC),
                                  (11, 15, "Proclamação da República", FONTE_NAC),
                                  (11, 20, "Dia Nacional de Zumbi e da Consciência Negra", "Lei 14.759/2023"),
                                  (12, 25, "Natal", FONTE_NAC)]:
            out.append({"Data": D(y, m, d), "Descrição": nome, "Abrangência": "Nacional", "Referência da fonte": fonte,
                        "Conferido": "Não"})
    return out


TIPOS_OC = [
    ("Afastamento por doença ou acidente (sem diagnóstico)", "Sim", "Sim",
     "Art. 133, IV: afastamento por mais de 6 meses no aquisitivo, mesmo descontínuo, pode gerar perda do direito. Conferir."),
    ("Licença-maternidade", "Sim", "Sim", "Art. 131, II: não conta como falta. Conferir datas e efeitos no período."),
    ("Licença-paternidade", "Não", "Sim", "Não conta como falta. Não programe férias no mesmo intervalo."),
    ("Licença remunerada", "Sim", "Sim", "Art. 133, II: mais de 30 dias de licença remunerada no aquisitivo pode gerar perda do direito."),
    ("Licença não remunerada", "Sim", "Sim", "Pode afetar a contagem do período. Conferir caso a caso."),
    ("Suspensão contratual", "Sim", "Sim", "Pode afetar a contagem do período. Conferir caso a caso."),
    ("Paralisação dos serviços", "Sim", "Sim", "Art. 133, III: paralisação por mais de 30 dias com salário pode gerar perda do direito."),
    ("Serviço militar", "Sim", "Sim", "Art. 132: regras próprias de contagem. Conferir."),
    ("Faltas injustificadas (lote)", "Sim", "Não", "Some as faltas conferidas e registre o total na aba 04."),
    ("Férias coletivas", "Sim", "Sim", "Arts. 139 a 141. Fora do escopo do controle individual: trate à parte."),
    ("Outra ocorrência", "Sim", "Não", "Descreva na justificativa e conclua a análise."),
]

ESCALAS_MODELO = [
    {"Código da escala": "ADM-5X2", "Descrição": "Segunda a sexta, DSR domingo, sábado livre", "Tipo": "Fixa",
     "Dia do DSR": "Domingo", "Folga adicional fixa": "Sábado", "Folga adicional conta na vedação": "Não"},
    {"Código da escala": "COM-6X1", "Descrição": "Seis dias de trabalho, DSR domingo", "Tipo": "Fixa", "Dia do DSR": "Domingo"},
    {"Código da escala": "12X36", "Descrição": "Plantão 12x36 (descansos variáveis)", "Tipo": "Variável"},
]


def tipos_oc():
    return [{"Tipo de ocorrência": a, "Pode afetar o direito ou o período": b, "Incompatível com gozo de férias": c, "Orientação": d}
            for a, b, c, d in TIPOS_OC]


def dataset_limpo():
    return {
        "demo": False,
        "params": {"alerta1": 90, "alerta2": 60, "alerta3": 30},
        "T_TiposOc": tipos_oc(),
        "T_Escalas": [dict(e) for e in ESCALAS_MODELO],
        "T_Feriados": feriados_nacionais([2026, 2027, 2028]),
        "calendario": {"mes": "Novembro", "ano": 2026},
    }


def dataset_demo():
    d = {"demo": True,
         "params": {"data_manual": D(2026, 10, 15), "alerta1": 90, "alerta2": 60, "alerta3": 30, "limite": None,
                    "norma": "CCT fictícia 2026/2027 (exemplo)",
                    "obs_regras": "Exemplo: a norma coletiva fictícia não altera prazos. Regras coletivas são conferidas caso a caso."},
         "T_TiposOc": tipos_oc(),
         "ficha_vinculo": "V0003",
         "calendario": {"mes": "Dezembro", "ano": 2026, "empresa": "(Todas)", "estab": "(Todos)", "setor": "(Todos)",
                        "equipe": "(Todas)", "solic": "Sim"}}
    d["T_Empresas"] = [{"ID da empresa": "E01", "Nome da empresa": "Padaria Sol Nascente Ltda (fictícia)"},
                       {"ID da empresa": "E02", "Nome da empresa": "Clínica Bem Viver Ltda (fictícia)"}]
    d["T_Estab"] = [
        {"ID do estabelecimento": "E01-MATRIZ", "ID da empresa": "E01", "Nome do estabelecimento": "Matriz", "Município": "São Paulo", "UF": "SP"},
        {"ID do estabelecimento": "E01-FILIAL", "ID da empresa": "E01", "Nome do estabelecimento": "Filial Centro", "Município": "São Paulo", "UF": "SP"},
        {"ID do estabelecimento": "E02-UNI1", "ID da empresa": "E02", "Nome do estabelecimento": "Unidade Savassi", "Município": "Belo Horizonte", "UF": "MG"},
        {"ID do estabelecimento": "E02-UNI2", "ID da empresa": "E02", "Nome do estabelecimento": "Unidade Pampulha", "Município": "Belo Horizonte", "UF": "MG"}]
    d["T_Local"] = [{"Código da localidade": "SP-SAO", "Município": "São Paulo", "UF": "SP"},
                    {"Código da localidade": "MG-BHE", "Município": "Belo Horizonte", "UF": "MG"}]
    d["T_Setores"] = [{"Setor": s} for s in ["Produção", "Loja", "Administração", "Atendimento", "Assistencial", "Apoio"]]
    d["T_Equipes"] = [
        {"Equipe": "Produção", "ID da empresa": "E01", "Setor": "Produção", "Limite interno de ausências simultâneas": 1},
        {"Equipe": "Atendimento", "ID da empresa": "E01", "Setor": "Loja", "Limite interno de ausências simultâneas": 2},
        {"Equipe": "Administrativo", "ID da empresa": "E01", "Setor": "Administração", "Limite interno de ausências simultâneas": 1},
        {"Equipe": "Recepção", "ID da empresa": "E02", "Setor": "Atendimento", "Limite interno de ausências simultâneas": 1},
        {"Equipe": "Enfermagem", "ID da empresa": "E02", "Setor": "Assistencial", "Limite interno de ausências simultâneas": 2},
        {"Equipe": "Financeiro", "ID da empresa": "E02", "Setor": "Administração",
         "Observação": "Limite ainda não definido (exemplo)"},
        {"Equipe": "Higienização", "ID da empresa": "E02", "Setor": "Apoio", "Limite interno de ausências simultâneas": 1}]
    d["T_Cargos"] = [{"Cargo": c} for c in ["Padeira", "Atendente", "Confeiteiro", "Auxiliar administrativo", "Forneiro", "Caixa",
                                            "Entregador", "Auxiliar de produção", "Técnica de enfermagem", "Recepcionista",
                                            "Analista financeira", "Enfermeira", "Auxiliar de limpeza"]]
    d["T_Gestores"] = [{"Gestor": "Rita Campos", "ID da empresa": "E01", "Área": "Produção"},
                       {"Gestor": "Sérgio Paiva", "ID da empresa": "E01", "Área": "Loja"},
                       {"Gestor": "Teresa Lins", "ID da empresa": "E01", "Área": "Administração"},
                       {"Gestor": "Paulo Antunes", "ID da empresa": "E02", "Área": "Atendimento"},
                       {"Gestor": "Márcia Veloso", "ID da empresa": "E02", "Área": "Assistencial"},
                       {"Gestor": "Luísa Freitas", "ID da empresa": "E02", "Área": "Administração"}]
    d["T_Resp"] = [{"Responsável": "Joana (DP)", "Papel": "DP"}, {"Responsável": "Marcos (Conferência)", "Papel": "Conferência"},
                   {"Responsável": "Helena (Financeiro)", "Papel": "Pagamento"}]
    d["T_Escalas"] = [dict(e) for e in ESCALAS_MODELO] + [
        {"Código da escala": "6X1-SEG", "Descrição": "Seis dias de trabalho, DSR segunda-feira", "Tipo": "Fixa", "Dia do DSR": "Segunda"}]
    d["T_Normas"] = [{"Referência da norma coletiva": "CCT-FICT-2026", "Descrição": "Convenção fictícia de exemplo",
                      "Vigência": "01/03/2026 a 28/02/2027", "Regras específicas observadas": "Nenhuma regra diferente da CLT (exemplo)."}]
    ex = "Exemplo demonstrativo: conferir no ato oficial"
    fer = feriados_nacionais([2026, 2027, 2028])
    for f in fer:
        f["Conferido"] = "Sim"
    fer += [
        {"Data": D(2026, 1, 25), "Descrição": "Aniversário de São Paulo", "Abrangência": "Municipal", "UF": "SP", "Código da localidade": "SP-SAO", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2026, 4, 3), "Descrição": "Sexta-feira da Paixão", "Abrangência": "Municipal", "UF": "SP", "Código da localidade": "SP-SAO", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2026, 6, 4), "Descrição": "Corpus Christi", "Abrangência": "Municipal", "UF": "SP", "Código da localidade": "SP-SAO", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2026, 7, 9), "Descrição": "Revolução Constitucionalista", "Abrangência": "Estadual", "UF": "SP", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2027, 1, 25), "Descrição": "Aniversário de São Paulo", "Abrangência": "Municipal", "UF": "SP", "Código da localidade": "SP-SAO", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2026, 4, 3), "Descrição": "Sexta-feira da Paixão", "Abrangência": "Municipal", "UF": "MG", "Código da localidade": "MG-BHE", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2026, 6, 4), "Descrição": "Corpus Christi", "Abrangência": "Municipal", "UF": "MG", "Código da localidade": "MG-BHE", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2026, 8, 15), "Descrição": "Assunção de Nossa Senhora", "Abrangência": "Municipal", "UF": "MG", "Código da localidade": "MG-BHE", "Referência da fonte": ex, "Conferido": "Não"},
        {"Data": D(2026, 12, 8), "Descrição": "Imaculada Conceição", "Abrangência": "Municipal", "UF": "MG", "Código da localidade": "MG-BHE", "Referência da fonte": ex, "Conferido": "Não"},
    ]
    d["T_Feriados"] = fer
    d["T_CalRev"] = [
        {"Ano": 2026, "Código da localidade": "SP-SAO", "Calendário revisado": "Sim", "Responsável": "Joana (DP)", "Data da revisão": D(2026, 1, 5)},
        {"Ano": 2026, "Código da localidade": "MG-BHE", "Calendário revisado": "Sim", "Responsável": "Joana (DP)", "Data da revisão": D(2026, 1, 5)},
        {"Ano": 2027, "Código da localidade": "SP-SAO", "Calendário revisado": "Não", "Observação": "Faltam feriados municipais de 2027 (exemplo)"}]

    def V(i, emp, est, mat, nome, adm, cargo, setor, equipe, gestor, loc, esc, reg="CLT regra geral", sit="Ativo", desl=None, obs=None):
        return {"ID do vínculo": i, "ID da empresa": emp, "Estabelecimento": est, "Matrícula": mat, "Nome": nome,
                "Data de admissão": adm, "Cargo": cargo, "Setor": setor, "Equipe": equipe, "Gestor": gestor,
                "Localidade de trabalho": loc, "Escala ou jornada": esc, "Regime contratual": reg, "Situação do vínculo": sit,
                "Data de desligamento": desl, "Norma coletiva": "CCT-FICT-2026", "Responsável pelo controle": "Joana (DP)",
                "Observações operacionais": obs}
    d["T_Func"] = [
        V("V0001", "E01", "E01-MATRIZ", "0001", "Ana Souza", D(2024, 3, 10), "Padeira", "Produção", "Produção", "Rita Campos", "SP-SAO", "6X1-SEG",
          obs="Mesmo nome de V0015 (outra pessoa, outra empresa)"),
        V("V0002", "E01", "E01-MATRIZ", "0002", "Bruno Lima", D(2023, 8, 1), "Atendente", "Loja", "Atendimento", "Sérgio Paiva", "SP-SAO", "COM-6X1"),
        V("V0003", "E01", "E01-FILIAL", "0003", "Carla Mendes", D(2025, 2, 5), "Atendente", "Loja", "Atendimento", "Sérgio Paiva", "SP-SAO", "COM-6X1"),
        V("V0004", "E01", "E01-MATRIZ", "0004", "Diego Rocha", D(2024, 6, 3), "Confeiteiro", "Produção", "Produção", "Rita Campos", "SP-SAO", "6X1-SEG"),
        V("V0005", "E02", "E02-UNI1", "0005", "Elisa Prado", D(2025, 1, 12), "Técnica de enfermagem", "Assistencial", "Enfermagem", "Márcia Veloso", "MG-BHE", "COM-6X1"),
        V("V0006", "E02", "E02-UNI1", "0006", "Fábio Nunes", D(2024, 5, 2), "Recepcionista", "Atendimento", "Recepção", "Paulo Antunes", "MG-BHE", "COM-6X1"),
        V("V0007", "E02", "E02-UNI1", "0007", "Gabriela Torres", D(2024, 4, 1), "Analista financeira", "Administração", "Financeiro", "Luísa Freitas", "MG-BHE", "ADM-5X2"),
        V("V0008", "E01", "E01-MATRIZ", "0008", "Henrique Alves", D(2024, 11, 20), "Auxiliar administrativo", "Administração", "Administrativo", "Teresa Lins", "SP-SAO", "ADM-5X2"),
        V("V0009", "E02", "E02-UNI2", "0009", "Iara Costa", D(2025, 1, 5), "Recepcionista", "Atendimento", "Recepção", "Paulo Antunes", "MG-BHE", "COM-6X1"),
        V("V0010", "E02", "E02-UNI1", "0010", "Paula Gomes", D(2026, 7, 1), "Técnica de enfermagem", "Assistencial", "Enfermagem", "Márcia Veloso", "MG-BHE", "12X36",
          obs="Admissão recente"),
        V("V0011", "E02", "E02-UNI1", "0011", "Júlia Ramos", D(2023, 3, 1), "Enfermeira", "Assistencial", "Enfermagem", "Márcia Veloso", "MG-BHE", "COM-6X1",
          sit="Afastado"),
        V("V0012", "E01", "E01-MATRIZ", "0012", "Lucas Martins", D(2025, 4, 14), "Forneiro", "Produção", "Produção", "Rita Campos", "SP-SAO", "12X36"),
        V("V0013", "E02", "E02-UNI1", "0013", "Marina Dias", D(2024, 8, 10), "Recepcionista", "Atendimento", "Recepção", "Paulo Antunes", "MG-BHE", "COM-6X1"),
        V("V0014", "E01", "E01-FILIAL", "0014", "Nelson Pires", D(2025, 6, 2), "Caixa", "Loja", "Atendimento", "Sérgio Paiva", "SP-SAO", "COM-6X1"),
        V("V0015", "E02", "E02-UNI1", "0001", "Ana Souza", D(2025, 3, 3), "Auxiliar de limpeza", "Apoio", "Higienização", "Márcia Veloso", "MG-BHE", "COM-6X1",
          obs="Matrícula 0001 também existe na E01, sem mistura"),
        V("V0016", "E01", "E01-MATRIZ", "0016", "Carlos Eduardo Silva", D(2023, 1, 2), "Entregador", "Loja", "Atendimento", "Sérgio Paiva", "SP-SAO", "COM-6X1",
          sit="Desligado", desl=D(2025, 6, 30), obs="Vínculo encerrado. Readmitido em V0017"),
        V("V0017", "E01", "E01-MATRIZ", "0031", "Carlos Eduardo Silva", D(2026, 9, 1), "Entregador", "Loja", "Atendimento", "Sérgio Paiva", "SP-SAO", "COM-6X1",
          obs="Readmissão: vínculo anterior V0016"),
        V("V0018", "E01", "E01-MATRIZ", "0032", "Otávio Reis", D(2025, 2, 1), "Auxiliar de produção", "Produção", "Produção", "Rita Campos", "SP-SAO", "6X1-SEG",
          reg="Intermitente", obs="Regime fora do escopo automático"),
    ]

    def P(v, n, faltas=0, sit="Conferido", hist_g=None, hist_a=None, hist_p=None, hist_m=None, dir_aj=None, ref=None, just=None, data_conf=None):
        return {"ID do vínculo": v, "Nº do período": n, "Faltas injustificadas conferidas": faltas, "Situação da apuração do direito": sit,
                "Direito ajustado": dir_aj, "Gozo anterior à planilha": hist_g, "Abono anterior à planilha": hist_a,
                "Parcelas anteriores à planilha": hist_p, "Maior parcela anterior": hist_m,
                "Responsável pela conferência": "Marcos (Conferência)" if sit and sit != "Pendente" else None,
                "Data da conferência": data_conf, "Justificativa de ajuste": just, "Referência documental": ref}
    d["T_Per"] = [
        P("V0001", 1, 0, data_conf=D(2025, 3, 20), ref="Pasta DP/V0001/2024"),
        P("V0001", 2, 2, data_conf=D(2026, 3, 15)),
        P("V0002", 2, 3, data_conf=D(2025, 8, 10)),
        P("V0002", 3, 0, data_conf=D(2026, 8, 5)),
        P("V0003", 1, 1, data_conf=D(2026, 2, 10)),
        P("V0004", 1, 0, hist_g=30, hist_p=1, hist_m=30, ref="Histórico importado do sistema anterior"),
        P("V0004", 2, 0, data_conf=D(2026, 6, 10)),
        P("V0005", 1, 0, data_conf=D(2026, 1, 20)),
        P("V0006", 2, 8, data_conf=D(2026, 5, 10), ref="Espelho de ponto 05/2025 a 04/2026"),
        P("V0007", 2, 0, data_conf=D(2026, 4, 8)),
        P("V0008", 1, 0, data_conf=D(2025, 11, 25)),
        P("V0009", 1, 0, data_conf=D(2026, 1, 10)),
        P("V0010", 1, None, sit="Pendente"),
        P("V0011", 3, 0, data_conf=D(2026, 3, 5)),
        P("V0011", 4, None, sit="Pendente"),
        P("V0012", 1, 0, data_conf=D(2026, 4, 20)),
        P("V0013", 1, 0, hist_g=30, hist_p=1, hist_m=30, ref="Histórico importado do sistema anterior"),
        P("V0013", 2, 0, data_conf=D(2026, 8, 12)),
        P("V0014", 1, 4, data_conf=D(2026, 6, 5)),
        P("V0015", 1, 0, data_conf=D(2026, 3, 10)),
        P("V0016", 1, 0, hist_g=30, hist_p=1, hist_m=30),
        P("V0016", 2, 0, data_conf=D(2025, 1, 10)),
        P("V0017", 1, None, sit="Pendente"),
        P("V0018", 1, 0, data_conf=D(2026, 2, 5)),
    ]

    def G(i, v, per, sit, ini, dias, sol=None, ab=None, ab_d=None, ab_s=None, conc=None, aprov=None, doc=None, ant=None, mot=None, obs=None):
        return {"ID da programação": i, "ID do vínculo": v, "ID do período": per, "Situação da programação": sit,
                "Data de solicitação": sol, "Data de início": ini, "Dias de gozo": dias, "Dias de abono": ab,
                "Data da solicitação do abono": ab_d, "Situação do abono": ab_s, "Concordância com fracionamento": conc,
                "Data da aprovação": aprov, "Referência do documento": doc, "Programação anterior relacionada": ant,
                "Motivo de cancelamento ou reagendamento": mot, "Observações": obs}
    d["T_Prog"] = [
        G("PG0001", "V0001", "V0001-P1", "Concluída", D(2026, 1, 6), 30, D(2025, 11, 10), aprov=D(2025, 11, 20), doc="Aviso 2025-11", obs="Gozo integral"),
        G("PG0002", "V0002", "V0002-P2", "Concluída", D(2026, 1, 5), 20, D(2025, 11, 1), conc="Sim", aprov=D(2025, 11, 5), obs="Restaram 10 dias sem programação"),
        G("PG0003", "V0003", "V0003-P1", "Concluída", D(2026, 4, 6), 14, D(2026, 2, 15), conc="Sim", aprov=D(2026, 2, 20)),
        G("PG0004", "V0003", "V0003-P1", "Aprovada", D(2026, 11, 9), 10, D(2026, 9, 1), conc="Sim", aprov=D(2026, 9, 10)),
        G("PG0005", "V0003", "V0003-P1", "Aprovada", D(2027, 1, 18), 6, D(2026, 9, 1), conc="Sim", aprov=D(2026, 9, 10), obs="Atravessa para 2027"),
        G("PG0006", "V0004", "V0004-P2", "Concluída", D(2026, 7, 7), 10, D(2026, 6, 1), conc="Sim", aprov=D(2026, 6, 3)),
        G("PG0007", "V0004", "V0004-P2", "Aprovada", D(2026, 11, 17), 10, D(2026, 9, 15), aprov=D(2026, 9, 20), obs="Fracionamento sem parcela de 14 dias"),
        G("PG0008", "V0012", "V0012-P1", "Aprovada", D(2026, 11, 23), 15, D(2026, 9, 20), conc="Sim", aprov=D(2026, 9, 25)),
        G("PG0009", "V0014", "V0014-P1", "Aprovada", D(2026, 12, 21), 30, D(2026, 10, 1), aprov=D(2026, 10, 5), obs="Atravessa dezembro e janeiro"),
        G("PG0010", "V0005", "V0005-P1", "Concluída", D(2026, 7, 6), 20, D(2026, 5, 2), ab=10, ab_d=D(2025, 12, 10), ab_s="Confirmado", aprov=D(2026, 5, 5)),
        G("PG0011", "V0006", "V0006-P2", "Aprovada", D(2026, 11, 9), 24, D(2026, 9, 1), aprov=D(2026, 9, 8), obs="Direito de 24 dias (8 faltas)"),
        G("PG0012", "V0007", "V0007-P2", "Cancelada", D(2026, 8, 3), 30, D(2026, 6, 1), aprov=D(2026, 6, 10), mot="Reagendada a pedido da gestão"),
        G("PG0013", "V0007", "V0007-P2", "Aprovada", D(2026, 11, 23), 30, D(2026, 7, 20), aprov=D(2026, 7, 25), ant="PG0012", mot="Reagendamento de PG0012"),
        G("PG0014", "V0009", "V0009-P1", "Solicitada", D(2026, 12, 7), 14, D(2026, 9, 20), ab=10, ab_d=D(2026, 9, 20), ab_s="Solicitado", conc="Sim"),
        G("PG0015", "V0013", "V0013-P2", "Em gozo", D(2026, 10, 5), 15, D(2026, 8, 15), conc="Sim", aprov=D(2026, 8, 20)),
        G("PG0016", "V0013", "V0013-P2", "Aprovada", D(2026, 12, 3), 15, D(2026, 8, 15), conc="Sim", aprov=D(2026, 8, 20)),
        G("PG0017", "V0015", "V0015-P1", "Rascunho", D(2026, 11, 18), 15, obs="Simulação: início em 18/11 antecede o feriado de 20/11"),
    ]
    d["T_Prov"] = [
        {"ID da programação": "PG0001", "Data de entrega do aviso": D(2025, 11, 25), "Responsável pelo aviso": "Joana (DP)",
         "Data da ciência do empregado": D(2025, 11, 25), "Conteúdo do aviso conferido": "Sim", "Data da conferência de valores": D(2025, 12, 30),
         "Situação do pagamento": "Confirmado", "Data agendada": D(2026, 1, 2), "Data do pagamento realizado": D(2026, 1, 2),
         "Data da confirmação do pagamento": D(2026, 1, 2), "Responsável pelo pagamento": "Helena (Financeiro)",
         "Data do registro no sistema": D(2025, 12, 29), "Data do arquivamento": D(2026, 2, 10), "Referência do arquivo": "Pasta DP/V0001",
         "Documentos arquivados conferidos": "Sim", "Data de conclusão das providências": D(2026, 2, 10)},
        {"ID da programação": "PG0004", "Data interna prevista do aviso": D(2026, 10, 1), "Data de entrega do aviso": D(2026, 10, 5),
         "Responsável pelo aviso": "Joana (DP)", "Evidência do aviso": "Drive/avisos/PG0004.pdf", "Data da ciência do empregado": D(2026, 10, 6),
         "Conteúdo do aviso conferido": "Sim", "Situação do pagamento": "Previsto", "Data interna prevista do pagamento": D(2026, 11, 4),
         "Responsável pelo pagamento": "Helena (Financeiro)"},
        {"ID da programação": "PG0007", "Data de entrega do aviso": D(2026, 10, 10), "Data da ciência do empregado": D(2026, 10, 10),
         "Conteúdo do aviso conferido": "Sim", "Situação do pagamento": "Previsto"},
        {"ID da programação": "PG0008", "Data interna prevista do aviso": D(2026, 10, 14), "Responsável pelo aviso": "Joana (DP)",
         "Situação do pagamento": "Previsto"},
        {"ID da programação": "PG0009", "Data interna prevista do aviso": D(2026, 11, 10), "Situação do pagamento": "Previsto"},
        {"ID da programação": "PG0010", "Data de entrega do aviso": D(2026, 6, 1), "Responsável pelo aviso": "Joana (DP)",
         "Evidência do aviso": "Drive/avisos/PG0010.pdf", "Data da ciência do empregado": D(2026, 6, 1), "Conteúdo do aviso conferido": "Sim",
         "Data da conferência de valores": D(2026, 6, 30), "Responsável pela conferência de valores": "Marcos (Conferência)",
         "Situação do pagamento": "Confirmado", "Data agendada": D(2026, 7, 2), "Data do pagamento realizado": D(2026, 7, 2),
         "Data da confirmação do pagamento": D(2026, 7, 3), "Responsável pelo pagamento": "Helena (Financeiro)",
         "Evidência do pagamento": "Comprovante bancário 02/07", "Data do registro no sistema": D(2026, 6, 30),
         "Data do arquivamento": D(2026, 7, 31), "Referência do arquivo": "Pasta DP/V0005", "Documentos arquivados conferidos": "Sim",
         "Data de conclusão das providências": D(2026, 7, 31)},
        {"ID da programação": "PG0011", "Situação do pagamento": "Agendado", "Data agendada": D(2026, 11, 6), "Responsável pelo pagamento": "Helena (Financeiro)",
         "Data da conferência de valores": D(2026, 10, 14), "Observação": "Aviso ainda não entregue"},
        {"ID da programação": "PG0013", "Data de entrega do aviso": D(2026, 10, 14), "Responsável pelo aviso": "Joana (DP)",
         "Evidência do aviso": "Drive/avisos/PG0013.pdf", "Data da ciência do empregado": D(2026, 10, 14), "Conteúdo do aviso conferido": "Não",
         "Situação do pagamento": "Previsto"},
        {"ID da programação": "PG0015", "Data de entrega do aviso": D(2026, 9, 1), "Data da ciência do empregado": D(2026, 9, 1),
         "Conteúdo do aviso conferido": "Sim", "Data da conferência de valores": D(2026, 9, 30), "Situação do pagamento": "Confirmado",
         "Data agendada": D(2026, 10, 2), "Data do pagamento realizado": D(2026, 10, 2), "Data da confirmação do pagamento": D(2026, 10, 2),
         "Data do registro no sistema": D(2026, 9, 30)},
    ]
    d["T_Oc"] = [
        {"ID da ocorrência": "OC0001", "ID do vínculo": "V0011", "Tipo": "Afastamento por doença ou acidente (sem diagnóstico)",
         "Início": D(2026, 2, 10), "Referência do documento": "Comunicação de afastamento nº 123 (fictícia)", "Análise necessária": "Sim",
         "Situação da análise": "Pendente", "Responsável": "Marcos (Conferência)"},
        {"ID da ocorrência": "OC0002", "ID do vínculo": "V0006", "ID do período afetado": "V0006-P2", "Tipo": "Faltas injustificadas (lote)",
         "Início": D(2025, 5, 2), "Término": D(2026, 5, 1), "Referência do documento": "Espelho de ponto", "Análise necessária": "Sim",
         "Situação da análise": "Concluída", "Efeito confirmado": "Reduz o direito", "Direito ajustado": 24, "Responsável": "Marcos (Conferência)",
         "Data da conclusão": D(2026, 5, 10), "Justificativa": "8 faltas injustificadas conferidas: 24 dias (art. 130, II)"},
        {"ID da ocorrência": "OC0003", "ID do vínculo": "V0001", "Tipo": "Férias coletivas", "Início": D(2026, 12, 24), "Término": D(2026, 12, 31),
         "Referência do documento": "Comunicado interno (fictício)", "Análise necessária": "Sim", "Situação da análise": "Em análise",
         "Responsável": "Joana (DP)", "Justificativa": "Registrada só para controle. Tratar fora do controle individual"},
    ]
    d["T_Est"] = [
        {"ID da programação": "PG0004", "Referência salarial": "Salário 10/2026", "Tipo de remuneração": "Mensalista", "Salário informado": 2200.0,
         "Premissas e observações": "Sem médias variáveis"},
        {"ID da programação": "PG0010", "Referência salarial": "Salário 06/2026", "Tipo de remuneração": "Mensalista", "Salário informado": 3400.0,
         "Médias e adicionais apurados": 280.0, "Valor conferido na folha": 4906.67, "Premissas e observações": "Média de adicional noturno apurada pelo DP"},
        {"ID da programação": "PG0011", "Referência salarial": "Salário 10/2026", "Tipo de remuneração": "Mensalista", "Salário informado": 2500.0},
        {"ID da programação": "PG0013", "Referência salarial": "Salário 10/2026", "Tipo de remuneração": "Mensalista", "Salário informado": 5800.0},
        {"ID da programação": "PG0009", "Referência salarial": "Salário-hora 10/2026", "Tipo de remuneração": "Horista", "Salário informado": 2310.0,
         "Premissas e observações": "Base mensal equivalente (220 h × R$ 10,50) informada pelo DP"},
    ]
    return d
