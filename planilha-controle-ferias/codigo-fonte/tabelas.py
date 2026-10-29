"""Definição das tabelas, colunas e fórmulas da planilha."""
from comum import (Col, Table, CAP, HDR_ROW, aniv, dtxt, idxv, idxt, hol, score, choose, s,
                   S_CONFIG, S_FUNC, S_PER, S_PROG, S_OC, S_PROV, S_EST)

MSGS = {}   # nome -> lista de (texto, ação, gravidade, cor); gravado na aba de apoio


def msgs(nome, itens):
    MSGS[nome] = itens


def mt(nome, code, x=None):
    base = f'INDEX(M_{nome}_T,{code})&""'
    return f'SUBSTITUTE({base},"{{x}}",{x})' if x else base


def ma(nome, code, x=None):
    base = f'INDEX(M_{nome}_A,{code})&""'
    return f'SUBSTITUTE({base},"{{x}}",{x})' if x else base


def mg(nome, code):
    return f"INDEX(M_{nome}_G,{code})"


def mc(nome, code):
    return f"INDEX(M_{nome}_C,{code})"


D = ("date",)
LIST = lambda name, style="stop": ("list", name, style)
INT = lambda a, b, style="warning": ("int", a, b, style)
MONEY = ("money",)


def I(h, w=12, fmt="text", dv=None, note=None, group=None):
    return Col(h, "in", None, w, fmt, dv, note, None, group)


def C(h, f, w=12, fmt="text", note=None, cor=None, group=None):
    return Col(h, "calc", f, w, fmt, None, note, cor, group)


def T(h, f, fmt="text"):
    return Col(h, "tec", f, 7, fmt)


# ---------------------------------------------------------------- Configurações
def config_tables():
    t = {}
    t["T_Empresas"] = [I("ID da empresa", 12, note="Código curto e único. Exemplo: E01."),
                       I("Nome da empresa", 30), I("Observação", 22)]
    t["T_Estab"] = [I("ID do estabelecimento", 14, note="Exemplo: E01-MATRIZ."),
                    I("ID da empresa", 11, dv=LIST("lst_Empresas")),
                    I("Nome do estabelecimento", 24), I("Município", 18), I("UF", 6, dv=LIST("L_UF")),
                    C("Situação", '=IF([@ID do estabelecimento]="","",IF(COUNTIF(T_Empresas[ID da empresa],[@ID da empresa])=0,"Empresa não cadastrada",IF(COUNTIF([ID do estabelecimento],[@ID do estabelecimento])>1,"ID repetido","Cadastrado")))', 16)]
    t["T_Local"] = [I("Código da localidade", 14, note="Usado para aplicar feriados estaduais e municipais. Exemplo: SP-SAO."),
                    I("Município", 20), I("UF", 6, dv=LIST("L_UF")),
                    C("Situação", '=IF([@Código da localidade]="","",IF(COUNTIF([Código da localidade],[@Código da localidade])>1,"Código repetido",IF([@UF]="","Informar UF","Cadastrada")))', 14)]
    t["T_Setores"] = [I("Setor", 20), I("ID da empresa", 11, dv=LIST("lst_Empresas", "warning")), I("Observação", 18)]
    t["T_Equipes"] = [I("Equipe", 20), I("ID da empresa", 11, dv=LIST("lst_Empresas")), I("Setor", 18, dv=LIST("lst_Setores", "warning")),
                      I("Limite interno de ausências simultâneas", 14, "int", INT(1, 999),
                        note="Parâmetro interno de gestão, sem previsão legal. Deixe vazio para usar o limite padrão da aba."),
                      I("Observação", 16),
                      T("Téc chave", '=IF([@Equipe]="","",[@ID da empresa]&"|"&[@Equipe])'),
                      C("Limite considerado", '=IF([@Equipe]="","",IF(ISNUMBER([@Limite interno de ausências simultâneas]),[@Limite interno de ausências simultâneas]&" (equipe)",IF(ISNUMBER(LimitePadrao),LimitePadrao&" (padrão)","Limite não definido")))', 16)]
    t["T_Cargos"] = [I("Cargo", 26), I("Observação", 18)]
    t["T_Gestores"] = [I("Gestor", 24), I("ID da empresa", 11, dv=LIST("lst_Empresas", "warning")), I("Área", 16)]
    t["T_Resp"] = [I("Responsável", 24), I("Papel", 14, dv=LIST("L_Papel", "warning")), I("Observação", 18)]
    dias = ";".join([])
    mask = "&".join([f'IF(OR([@Téc dsr]={n},[@Téc folga]={n}),"1","0")' for n in (2, 3, 4, 5, 6, 7, 1)])
    t["T_Escalas"] = [I("Código da escala", 12), I("Descrição", 26), I("Tipo", 10, dv=LIST("L_TipoEsc")),
                      I("Dia do DSR", 11, dv=LIST("L_Dias"), note="Dia do descanso semanal remunerado nas escalas fixas."),
                      I("Folga adicional fixa", 12, dv=LIST("L_Dias"), note="Opcional. Exemplo: sábado na jornada de segunda a sexta."),
                      I("Folga adicional conta na vedação", 12, dv=LIST("L_SimNao"),
                        note="Sim: a folga adicional também impede o início das férias nos dois dias anteriores. A regra geral da CLT cita apenas feriado e DSR."),
                      I("Observação", 20),
                      T("Téc dsr", '=IFERROR(MATCH([@Dia do DSR],L_Dias,0),0)'),
                      T("Téc folga", '=IFERROR(MATCH([@Folga adicional fixa],L_Dias,0),0)'),
                      T("Téc máscara", f'=IF([@Código da escala]="","",{mask})'),
                      C("Situação", '=IF([@Código da escala]="","",IF([@Tipo]="Variável","Variável: registre os descansos",IF([@Tipo]="Fixa",IF([@Téc dsr]=0,"Informar o dia do DSR","Fixa: DSR em "&[@Dia do DSR]),"Informar o tipo")))', 22)]
    t["T_Desc"] = [I("ID do vínculo", 11, dv=LIST("lst_Vinculos")), I("Data de descanso", 12, "date", D), I("Observação", 18),
                   C("Situação", '=IF(AND([@ID do vínculo]="",[@Data de descanso]=""),"",IF(COUNTIF(T_Func[ID do vínculo],[@ID do vínculo])=0,"Vínculo não encontrado",IF(ISNUMBER([@Data de descanso]),"Registrado","Informar a data")))', 16)]
    t["T_Feriados"] = [I("Data", 11, "date", D), I("Descrição", 30), I("Abrangência", 11, dv=LIST("L_Abrang")),
                       I("UF", 6, dv=LIST("L_UF")), I("Código da localidade", 13, dv=LIST("lst_Local")),
                       I("Referência da fonte", 30), I("Conferido", 9, dv=LIST("L_SimNao")),
                       C("Situação", '=IF(AND([@Data]="",[@Descrição]=""),"",IF(NOT(ISNUMBER([@Data])),"Informar a data",IF(AND([@Abrangência]="Estadual",[@UF]=""),"Informar UF",IF(AND([@Abrangência]="Municipal",[@Código da localidade]=""),"Informar localidade",IF([@Abrangência]="","Informar abrangência",IF([@Conferido]="Sim","Conferido","Conferir na fonte"))))))', 16)]
    t["T_CalRev"] = [I("Ano", 8, "int", INT(2000, 2100)), I("Código da localidade", 13, dv=LIST("lst_Local")),
                     I("Calendário revisado", 11, dv=LIST("L_SimNao"),
                       note="Marque Sim só depois de cadastrar todos os feriados nacionais, estaduais e municipais do ano para a localidade."),
                     I("Responsável", 16, dv=LIST("lst_Resp", "warning")), I("Data da revisão", 12, "date", D), I("Observação", 18),
                     C("Feriados cadastrados no ano", '=IF(OR(NOT(ISNUMBER([@Ano])),[@Código da localidade]=""),"",COUNTIFS(T_Feriados[Data],">="&DATE([@Ano],1,1),T_Feriados[Data],"<="&DATE([@Ano],12,31),T_Feriados[Abrangência],"Nacional")+COUNTIFS(T_Feriados[Data],">="&DATE([@Ano],1,1),T_Feriados[Data],"<="&DATE([@Ano],12,31),T_Feriados[Abrangência],"Estadual",T_Feriados[UF],IFERROR(INDEX(T_Local[UF],MATCH([@Código da localidade],T_Local[Código da localidade],0))&"","-"))+COUNTIFS(T_Feriados[Data],">="&DATE([@Ano],1,1),T_Feriados[Data],"<="&DATE([@Ano],12,31),T_Feriados[Abrangência],"Municipal",T_Feriados[Código da localidade],[@Código da localidade]))', 12, "int")]
    t["T_TiposOc"] = [I("Tipo de ocorrência", 34), I("Pode afetar o direito ou o período", 12, dv=LIST("L_SimNao")),
                      I("Incompatível com gozo de férias", 12, dv=LIST("L_SimNao")), I("Orientação", 50)]
    t["T_Normas"] = [I("Referência da norma coletiva", 22), I("Descrição", 26), I("Vigência", 16), I("Regras específicas observadas", 36)]
    return t


# ---------------------------------------------------------------- Funcionários
def func_cols():
    k = "(YEAR([@Téc ref])-YEAR([@Data de admissão]))"
    n_compl = (f'=IF(OR([@Téc ativo]=0,NOT(ISNUMBER([@Data de admissão]))),"",IF([@Téc ref]<[@Data de admissão],0,'
               f'{k}-IF([@Téc ref]<{aniv("[@Data de admissão]", "12*" + k)},1,0)))')
    code = ('=IF([@Téc ativo]=0,0,'
            'IF(OR([@ID do vínculo]="",[@ID da empresa]="",[@Nome]="",NOT(ISNUMBER([@Data de admissão])),[@Situação do vínculo]=""),1,'
            'IF(COUNTIF([ID do vínculo],[@ID do vínculo])>1,2,'
            'IF(COUNTIF(T_Empresas[ID da empresa],[@ID da empresa])=0,3,'
            'IF(AND([@Matrícula]<>"",SUMPRODUCT(--([ID da empresa]=[@ID da empresa]),--([Matrícula]=[@Matrícula]))>1),4,'
            'IF(AND(ISNUMBER([@Data de desligamento]),[@Data de desligamento]<[@Data de admissão]),5,'
            'IF(AND([@Situação do vínculo]="Desligado",NOT(ISNUMBER([@Data de desligamento]))),6,'
            'IF([@Situação do vínculo]="Desligado",7,'
            'IF(AND([@Estabelecimento]<>"",IFERROR(INDEX(T_Estab[ID da empresa],MATCH([@Estabelecimento],T_Estab[ID do estabelecimento],0))&"","")<>[@ID da empresa]),8,'
            'IF(ISNUMBER(MATCH([@Regime contratual],L_RegEsp,0)),9,'
            'IF([@Regime contratual]="",10,'
            'IF([@Téc esc]=0,11,'
            'IF([@Localidade de trabalho]="",13,IF([@Téc UF]="",13,'
            'IF(AND(N([@Períodos completos])>=1,COUNTIFS(T_Per[ID do vínculo],[@ID do vínculo],T_Per[Nº do período],N([@Períodos completos]))=0),14,'
            'IF([@Situação do vínculo]="Afastado",IF(COUNTIF(T_Oc[ID do vínculo],[@ID do vínculo])=0,15,18),'
            'IF([@Téc esc tipo]="Variável",12,'
            'IF(COUNTIF([Nome],[@Nome])>1,16,17))))))))))))))))))')
    msgs("Func", [
        ("Preencher ID, empresa, nome, admissão e situação", "Completar o cadastro", 1, 1),
        ("ID do vínculo repetido", "Corrigir o ID repetido", 1, 1),
        ("Empresa não cadastrada", "Cadastrar a empresa na aba 02", 1, 1),
        ("Matrícula repetida na mesma empresa", "Conferir a matrícula", 1, 1),
        ("Desligamento antes da admissão", "Corrigir as datas", 1, 1),
        ("Informar a data de desligamento", "Informar a data de desligamento", 3, 2),
        ("Desligado: histórico preservado", "", 0, 5),
        ("Estabelecimento de outra empresa", "Conferir o estabelecimento", 3, 2),
        ("Análise específica: {x}", "Analisar regras do regime", 3, 2),
        ("Informar o regime contratual", "Informar o regime", 3, 2),
        ("Informar escala cadastrada (DSR)", "Informar a escala", 3, 2),
        ("Escala variável: registre descansos ao programar", "", 0, 3),
        ("Informar localidade cadastrada (feriados)", "Informar a localidade", 3, 2),
        ("Cadastrar período aquisitivo nº {x}", "Cadastrar o período nº {x} na aba 04", 2, 2),
        ("Afastado: registrar ocorrência", "Registrar a ocorrência na aba 06", 3, 2),
        ("Mesmo nome em outro vínculo: use o ID", "", 0, 3),
        ("Cadastro completo segundo registros", "", 0, 4),
        ("Afastado: acompanhar ocorrência", "", 0, 3),
    ])
    cd = "[@Téc código]"
    txt = mt("Func", cd, 'IF(' + cd + '=9,[@Regime contratual],IF(' + cd + '=14,[@Períodos completos]&"",""))')
    acao = ma("Func", cd, '[@Períodos completos]&""')
    G = mg("Func", cd)
    cor = mc("Func", cd)
    return [
        I("ID do vínculo", 11, note="Identificador único do vínculo. Exemplo: V0001. Uma readmissão recebe um novo ID."),
        I("ID da empresa", 10, dv=LIST("lst_Empresas")),
        C("Nome da empresa", '=IF([@ID da empresa]="","",IFERROR(INDEX(T_Empresas[Nome da empresa],MATCH([@ID da empresa],T_Empresas[ID da empresa],0))&"","Empresa não cadastrada"))', 22),
        I("Estabelecimento", 13, dv=LIST("lst_Estab")),
        I("Matrícula", 10, "textfmt", note="Digite como texto. Matrículas iguais em empresas diferentes são aceitas."),
        I("Nome", 26),
        I("Data de admissão", 11, "date", D),
        I("Cargo", 18, dv=LIST("lst_Cargos", "warning")),
        I("Setor", 14, dv=LIST("lst_Setores", "warning")),
        I("Equipe", 14, dv=LIST("lst_Equipes", "warning"), note="A equipe é usada para comparar ausências simultâneas com o limite interno."),
        I("Gestor", 16, dv=LIST("lst_Gestores", "warning")),
        I("Localidade de trabalho", 12, dv=LIST("lst_Local"), note="Define os feriados estaduais e municipais aplicáveis."),
        I("Escala ou jornada", 12, dv=LIST("lst_Escalas"), note="Código cadastrado na aba 02. Define o dia de descanso semanal (DSR)."),
        I("Regime contratual", 16, dv=LIST("L_Regime"), note="Doméstico, intermitente e outros regimes especiais ficam marcados para análise específica."),
        I("Situação do vínculo", 11, dv=LIST("L_SitVinc")),
        I("Data de desligamento", 11, "date", D),
        I("Norma coletiva", 14, dv=LIST("lst_Normas", "warning")),
        I("Responsável pelo controle", 16, dv=LIST("lst_Resp", "warning")),
        I("Observações operacionais", 24, note="Não registre CPF completo, dados bancários ou diagnósticos médicos."),
        C("Períodos completos", n_compl, 10, "int", note="Quantidade de períodos aquisitivos completos até a data de referência (ou até o desligamento)."),
        C("Períodos cadastrados", '=IF([@Téc ativo]=0,"",COUNTIF(T_Per[ID do vínculo],[@ID do vínculo]))', 10, "int"),
        C("Alerta do cadastro", f'=IF([@Téc código]=0,"",{txt})', 32, cor="Téc cor"),
        T("Téc ativo", '=IF(LEN([@ID do vínculo]&[@Nome]&[@ID da empresa]&[@Data de admissão])>0,1,0)'),
        T("Téc linha", '=ROW()'),
        T("Téc ref", '=IF(AND(ISNUMBER([@Data de desligamento]),[@Data de desligamento]<DataRef),[@Data de desligamento],DataRef)', "date"),
        T("Téc UF", '=IF([@Localidade de trabalho]="","",IFERROR(INDEX(T_Local[UF],MATCH([@Localidade de trabalho],T_Local[Código da localidade],0))&"",""))'),
        T("Téc esc", '=IF([@Escala ou jornada]="",0,IFERROR(MATCH([@Escala ou jornada],T_Escalas[Código da escala],0),0))'),
        T("Téc esc tipo", '=IF([@Téc esc]=0,"",INDEX(T_Escalas[Tipo],[@Téc esc])&"")'),
        T("Téc dsr", '=IF([@Téc esc]=0,0,N(INDEX(T_Escalas[Téc dsr],[@Téc esc])))'),
        T("Téc folga", '=IF([@Téc esc]=0,0,N(INDEX(T_Escalas[Téc folga],[@Téc esc])))'),
        T("Téc folga conta", '=IF([@Téc esc]=0,"",INDEX(T_Escalas[Folga adicional conta na vedação],[@Téc esc])&"")'),
        T("Téc máscara", '=IF([@Téc esc]=0,"",INDEX(T_Escalas[Téc máscara],[@Téc esc])&"")'),
        T("Téc chave equipe", '=IF([@Equipe]="","",[@ID da empresa]&"|"&[@Equipe])'),
        T("Téc limite", '=IF([@Téc chave equipe]="","",IFERROR(IF(INDEX(T_Equipes[Limite interno de ausências simultâneas],MATCH([@Téc chave equipe],T_Equipes[Téc chave],0))="",IF(ISNUMBER(LimitePadrao),LimitePadrao,""),INDEX(T_Equipes[Limite interno de ausências simultâneas],MATCH([@Téc chave equipe],T_Equipes[Téc chave],0))),IF(ISNUMBER(LimitePadrao),LimitePadrao,"")))'),
        T("Téc em férias", '=IF(OR([@Téc ativo]=0,[@Situação do vínculo]="Desligado"),0,IF(COUNTIFS(T_Prog[ID do vínculo],[@ID do vínculo],T_Prog[Téc cap],1,T_Prog[Data de início],"<="&DataRef,T_Prog[Término],">="&DataRef)>0,1,0))'),
        T("Téc código", code),
        T("Téc cor", f'=IF([@Téc código]=0,"",{cor})'),
        T("Téc G", f'=IF([@Téc código]=0,0,{G})'),
        T("Téc ação", f'=IF([@Téc código]=0,"",{acao})'),
        T("Téc resp", '=[@Responsável pelo controle]&""'),
        T("Téc pontuação", '=' + score("[@Téc G]", '""', 7)),
    ]


# ---------------------------------------------------------------- Períodos
def per_cols():
    adm, n = "[@Téc adm]", "[@Téc n]"
    sng, sd, dir_ = "[@Saldo não gozado]", "[@Saldo disponível]", "[@Dias de direito]"
    fimc, ult, dias = "[@Término do concessivo]", "[@Último início para o saldo]", "[@Dias até o fim do concessivo]"
    sumprog = lambda col, crit: (f'SUMIFS(T_Prog[{col}],T_Prog[ID do período],[@ID do período],T_Prog[ID do vínculo],[@ID do vínculo],{crit})')
    cntprog = lambda crit: (f'COUNTIFS(T_Prog[ID do período],[@ID do período],T_Prog[ID do vínculo],[@ID do vínculo],{crit})')
    code = ('=IF([@Téc ativo]=0,0,'
            'IF(OR([@ID do vínculo]="",[@Nº do período]=""),1,'
            'IF([@Téc func]=0,2,'
            'IF(NOT(ISNUMBER([@Término do aquisitivo])),1,'
            'IF(COUNTIF([ID do período],[@ID do período])>1,3,'
            'IF([@Téc sit vínc]="Desligado",IF(N([@Saldo não gozado])>0,20,4),'
            'IF(AND([@Téc regime esp]=1,NOT(ISNUMBER([@Direito ajustado]))),5,'
            f'IF(OR(AND(ISNUMBER({sng}),N({sng})<0),AND(ISNUMBER({sd}),N({sd})<0)),6,'
            'IF([@Téc ocorr pend]>0,7,'
            'IF([@Téc ajuste pend]>0,8,'
            'IF(DataRef<=[@Término do aquisitivo],9,'
            'IF([@Situação da apuração do direito]="Análise específica",21,IF(OR([@Situação da apuração do direito]="",[@Situação da apuração do direito]="Pendente"),10,'
            f'IF(NOT(ISNUMBER({dir_})),11,'
            f'IF(AND(DataRef>{fimc},{sng}>0),12,'
            f'IF({sd}>0,IF(DataRef+30>{ult},13,IF({dias}<=Alerta3,14,IF({dias}<=Alerta2,15,IF({dias}<=Alerta1,16,17)))),'
            f'IF({sng}>0,18,19)))))))))))))))))')
    msgs("Per", [
        ("Preencher vínculo e nº do período", "Completar vínculo e nº do período", 1, 1),
        ("Vínculo não encontrado", "Corrigir o ID do vínculo", 1, 1),
        ("Período duplicado", "Excluir ou corrigir a linha duplicada", 1, 1),
        ("Desligado: histórico preservado", "", 0, 5),
        ("Análise específica (regime)", "Analisar regras do regime e registrar o direito", 2, 2),
        ("Saldo negativo: conferir registros", "Rever programações e histórico", 1, 1),
        ("Direito pendente de conferência", "Concluir a análise da ocorrência (aba 06)", 2, 2),
        ("Aplicar ajuste confirmado na ocorrência", "Registrar no período o ajuste confirmado", 2, 2),
        ("Em aquisição até {x}", "", 0, 5),
        ("Conferir direito", "Conferir faltas e registrar a apuração", 2, 2),
        ("Informar faltas ou direito ajustado", "Informar faltas conferidas ou direito ajustado", 1, 1),
        ("Concessivo encerrado com saldo", "Avaliar concessão fora do prazo com o responsável", 1, 1),
        ("Aviso de 30 dias já não cabe no concessivo", "Programar com urgência e avaliar com o responsável", 1, 1),
        ("Programar férias: concessivo termina em {x} dias", "Programar férias", 1, 1),
        ("Programar férias: concessivo termina em {x} dias", "Programar férias", 2, 2),
        ("Programar férias: concessivo termina em {x} dias", "Programar férias", 3, 2),
        ("Saldo a programar", "Programar férias", 4, 3),
        ("Programado: acompanhar as parcelas", "", 0, 3),
        ("Concluído segundo registros", "", 0, 4),
        ("Desligado: conferir quitação na rescisão", "", 0, 5),
        ("Análise específica do direito", "Concluir a análise e registrar a apuração", 2, 2),
    ])
    cd = "[@Téc código]"
    txt = mt("Per", cd, f'IF({cd}=9,{dtxt("[@Término do aquisitivo]")},{dias}&"")')
    acao = ma("Per", cd)
    P = f'IF(ISNUMBER({ult}),{ult}-30,"")'
    prazo = choose("[@Téc código]", ['""'] * 6 + [P, P, '""', P, P, fimc, ult, P, P, P, P, '""', '""', '""', P])
    G = mg("Per", cd)
    cor = mc("Per", cd)
    IF = lambda c, x, y: f"IF({c},{x},{y})"
    np_, rest, n5, n14 = "[@Téc n plano]", "[@Téc restante]", "[@Téc n menor5]", "[@Téc n14]"
    um = IF(f"{rest}=0", 10, IF(f"{n5}>0", 33, IF(f"{n14}=0", IF(f"{rest}<14", 36, 21), IF(f"{rest}<5", 38, 22))))
    varios = IF(f"{n5}>0", 33, IF(f"{n14}=0", IF(f"{rest}=0", 34, IF(f"{np_}=3", 35, IF(f"{rest}<14", 36, 21))),
                                IF(f"{rest}=0", 11, IF(f"{np_}=3", 37, IF(f"{rest}<5", 38, 22)))))
    frac = "=" + IF(f"OR(NOT(ISNUMBER([@Dias de direito])),{np_}=0)", 0, IF(f"{np_}>3", 31, IF(f"{rest}<0", 32, IF(f"{np_}=1", um, varios))))
    frac_txt = ('=IF([@Téc frac]=0,"",IF([@Téc frac]=10,"Parcela única",IF([@Téc frac]=11,"Fracionamento compatível",'
                'IF([@Téc frac]=21,"Parcial: falta a parcela de 14 dias ou mais",IF([@Téc frac]=22,"Parcial: saldo restante a programar",'
                'IF([@Téc frac]=31,"Mais de 3 parcelas",IF([@Téc frac]=32,"Dias programados acima do direito",IF([@Téc frac]=33,"Parcela com menos de 5 dias",'
                'IF([@Téc frac]=34,"Falta parcela de 14 dias ou mais",IF([@Téc frac]=35,"Sem parcela livre para a de 14 dias",'
                'IF([@Téc frac]=36,"Saldo restante não permite parcela de 14 dias",IF([@Téc frac]=37,"Saldo restante sem parcela disponível","Saldo restante menor que 5 dias"))))))))))))')
    return [
        C("ID do período", '=IF(OR([@ID do vínculo]="",[@Nº do período]=""),"",[@ID do vínculo]&"-P"&[@Nº do período])', 12,
          note="Gerado automaticamente: ID do vínculo + nº do período. Use este ID na aba 05."),
        I("ID do vínculo", 11, dv=LIST("lst_Vinculos")),
        I("Nº do período", 8, "int", INT(1, 80, "stop"), note="1 para o primeiro ano do contrato, 2 para o segundo, e assim por diante."),
        C("Nome", '=IF([@Téc func]=0,"",' + idxt("T_Func[Nome]", "[@Téc func]") + ')', 24),
        C("Empresa", '=IF([@Téc func]=0,"",' + idxt("T_Func[ID da empresa]", "[@Téc func]") + ')', 9),
        C("Início do aquisitivo", '=IF(ISNUMBER([@Início ajustado]),[@Início ajustado],[@Início padrão])', 11, "date"),
        C("Término do aquisitivo", '=IF(ISNUMBER([@Término ajustado]),[@Término ajustado],[@Término padrão])', 11, "date"),
        C("Início do concessivo", '=IF(ISNUMBER([@Término do aquisitivo]),[@Término do aquisitivo]+1,"")', 11, "date"),
        C("Término do concessivo", '=IF(NOT(ISNUMBER([@Término do aquisitivo])),"",IFERROR(IF(AND(NOT(ISNUMBER([@Início ajustado])),NOT(ISNUMBER([@Término ajustado]))),'
          + aniv(adm, f"12*({n}+1)") + '-1,' + aniv("([@Término do aquisitivo]+1)", "12") + '-1),""))', 11, "date",
          note="Data limite para concluir o gozo segundo a regra geral (12 meses após o aquisitivo)."),
        I("Faltas injustificadas conferidas", 12, "int", INT(0, 366),
          note="Somente faltas que reduzem o direito pela regra geral (art. 130). Digite 0 quando não houver. Ausências justificadas (art. 131) não entram aqui."),
        C("Direito pela tabela", '=IF(NOT(ISNUMBER([@Faltas injustificadas conferidas])),"",IF([@Faltas injustificadas conferidas]<=5,30,IF([@Faltas injustificadas conferidas]<=14,24,IF([@Faltas injustificadas conferidas]<=23,18,IF([@Faltas injustificadas conferidas]<=32,12,0)))))', 9, "int",
          note="Referência do cálculo padrão: até 5 faltas, 30 dias; 6 a 14, 24; 15 a 23, 18; 24 a 32, 12; acima de 32, sem direito pela tabela."),
        I("Situação da apuração do direito", 12, dv=LIST("L_SitApur")),
        I("Direito ajustado", 9, "int", INT(0, 30), note="Preencha só quando houver ajuste fundamentado. Registre justificativa e responsável."),
        C("Dias de direito", '=IF([@Téc ativo]=0,"",IF(ISNUMBER([@Direito ajustado]),[@Direito ajustado],IF([@Téc regime esp]=1,"",[@Direito pela tabela])))', 9, "int"),
        I("Gozo anterior à planilha", 10, "int", INT(0, 30), note="Histórico: dias já gozados antes de usar a planilha. Não lance aqui parcelas cadastradas na aba 05."),
        I("Abono anterior à planilha", 10, "int", INT(0, 10), note="Histórico: dias de abono já convertidos antes de usar a planilha."),
        I("Parcelas anteriores à planilha", 11, "int", INT(0, 3)),
        I("Maior parcela anterior", 9, "int", INT(0, 30), note="Tamanho da maior parcela já gozada antes da planilha. Usado na conferência do fracionamento."),
        C("Gozo confirmado", '=IF(OR([@Téc ativo]=0,[@ID do período]=""),"",N([@Gozo anterior à planilha])+' + sumprog("Dias de gozo", 'T_Prog[Téc efeito],"CONSUMO"') + ')', 9, "int",
          note="Dias de parcelas com situação Concluída, mais o histórico."),
        C("Abono confirmado", '=IF(OR([@Téc ativo]=0,[@ID do período]=""),"",N([@Abono anterior à planilha])+' + sumprog("Téc abono dias", 'T_Prog[Téc efeito abono],"CONSUMO"') + ')', 9, "int"),
        C("Gozo reservado", '=IF(OR([@Téc ativo]=0,[@ID do período]=""),"",' + sumprog("Dias de gozo", 'T_Prog[Téc efeito],"RESERVA"') + ')', 9, "int",
          note="Dias de parcelas Aprovadas ou Em gozo. Passam para gozo confirmado quando a situação muda para Concluída."),
        C("Abono reservado", '=IF(OR([@Téc ativo]=0,[@ID do período]=""),"",' + sumprog("Téc abono dias", 'T_Prog[Téc efeito abono],"RESERVA"') + ')', 9, "int",
          note="Abono solicitado em programação aprovada, ainda não confirmado."),
        C("Saldo não gozado", f'=IF(NOT(ISNUMBER([@Dias de direito])),"",[@Dias de direito]-[@Gozo confirmado]-[@Abono confirmado])', 9, "int",
          note="Direito menos gozo confirmado menos abono confirmado."),
        C("Saldo disponível", '=IF(NOT(ISNUMBER([@Saldo não gozado])),"",[@Saldo não gozado]-[@Gozo reservado]-[@Abono reservado])', 9, "int",
          note="Saldo que ainda pode receber novas programações. Solicitações não aprovadas não reduzem este saldo."),
        C("Demanda solicitada", '=IF(OR([@Téc ativo]=0,[@ID do período]=""),"",' + sumprog("Dias de gozo", 'T_Prog[Téc efeito],"DEMANDA"') + '+' + sumprog("Téc abono dias", 'T_Prog[Téc efeito abono],"DEMANDA"') + ')', 9, "int",
          note="Dias pedidos em programações Solicitadas, ainda sem aprovação. Não reservam saldo."),
        C("Quantidade de parcelas", '=IF(OR([@Téc ativo]=0,[@ID do período]=""),"",N([@Parcelas anteriores à planilha])+' + cntprog('T_Prog[Téc efeito],"RESERVA"') + '+' + cntprog('T_Prog[Téc efeito],"CONSUMO"') + ')', 9, "int",
          note="Parcelas aprovadas, em gozo ou concluídas, mais o histórico."),
        C("Avaliação do fracionamento", frac_txt, 22, cor="Téc frac cor"),
        C("Dias até o fim do concessivo", f'=IF(OR([@Téc ativo]=0,NOT(ISNUMBER({fimc}))),"",{fimc}-DataRef)', 10, "int"),
        C("Último início para o saldo", f'=IF(AND(ISNUMBER({sd}),ISNUMBER({fimc})),IF({sd}>0,{fimc}-{sd}+1,""),"")', 11, "date",
          note="Última data para iniciar o gozo de todo o saldo disponível em uma só parcela, terminando dentro do concessivo."),
        C("Ocorrência pendente", '=IF([@Téc ativo]=0,"",IF([@Téc ocorr pend]>0,"Sim ("&[@Téc ocorr pend]&")","Não"))', 9),
        C("Situação do período", f'=IF([@Téc código]=0,"",{txt})', 30, cor="Téc cor"),
        C("Próxima ação", f'=IF([@Téc código]=0,"",{acao})', 28),
        C("Prazo da ação", f'=IF([@Téc código]=0,"",{prazo})', 11, "date"),
        I("Início ajustado", 11, "date", D, note="Opcional. Preencha só quando o início precisar de ajuste fundamentado."),
        I("Término ajustado", 11, "date", D, note="Opcional. Quando houver ajuste, o concessivo passa a contar 12 meses a partir do dia seguinte."),
        C("Início padrão", f'=IFERROR(IF(OR({adm}="",{n}=""),"",{aniv(adm, "12*(" + n + "-1)")}),"")', 11, "date",
          note="Referência do cálculo padrão, preservada mesmo quando houver ajuste."),
        C("Término padrão", f'=IFERROR(IF(OR({adm}="",{n}=""),"",{aniv(adm, "12*" + n)}-1),"")', 11, "date"),
        I("Responsável pela conferência", 16, dv=LIST("lst_Resp", "warning")),
        I("Data da conferência", 11, "date", D),
        I("Justificativa de ajuste", 26),
        I("Referência documental", 20),
        T("Téc ativo", '=IF(LEN([@ID do vínculo]&[@Nº do período])>0,1,0)'),
        T("Téc linha", '=ROW()'),
        T("Téc func", '=IF([@ID do vínculo]="",0,IFERROR(MATCH([@ID do vínculo],T_Func[ID do vínculo],0),0))'),
        T("Téc adm", '=IF([@Téc func]=0,"",IF(ISNUMBER(INDEX(T_Func[Data de admissão],[@Téc func])),INDEX(T_Func[Data de admissão],[@Téc func]),""))', "date"),
        T("Téc n", '=IF(ISNUMBER([@Nº do período]),IF([@Nº do período]>=1,INT([@Nº do período]),""),"")'),
        T("Téc sit vínc", '=IF([@Téc func]=0,"",' + idxt("T_Func[Situação do vínculo]", "[@Téc func]") + ')'),
        T("Téc regime esp", '=IF([@Téc func]=0,0,IF(ISNUMBER(MATCH(INDEX(T_Func[Regime contratual],[@Téc func])&"",L_RegEsp,0)),1,0))'),
        T("Téc ocorr pend", '=IF([@ID do período]="",0,COUNTIFS(T_Oc[ID do período afetado],[@ID do período],T_Oc[Téc pendente],1)+IF(AND(ISNUMBER([@Início do aquisitivo]),ISNUMBER([@Término do aquisitivo])),COUNTIFS(T_Oc[ID do vínculo],[@ID do vínculo],T_Oc[Téc sem período],1,T_Oc[Téc pendente],1,T_Oc[Início],"<="&[@Término do aquisitivo],T_Oc[Téc término],">="&[@Início do aquisitivo]),0))'),
        T("Téc ajuste pend", '=IF([@ID do período]="",0,COUNTIFS(T_Oc[ID do período afetado],[@ID do período],T_Oc[Téc concluída],1,T_Oc[Téc tem direito],1,T_Oc[Direito ajustado],"<>"&[@Dias de direito]))'),
        T("Téc dir conferido", '=IF(AND(OR([@Situação da apuração do direito]="Conferido",[@Situação da apuração do direito]="Conferido com ajuste"),ISNUMBER([@Dias de direito]),[@Téc ocorr pend]=0,[@Téc ajuste pend]=0),1,0)'),
        T("Téc n plano", '=IF([@ID do período]="",0,N([@Parcelas anteriores à planilha])+' + cntprog('T_Prog[Téc plano],1') + ')'),
        T("Téc n14", '=IF([@ID do período]="",0,' + cntprog('T_Prog[Téc plano],1,T_Prog[Dias de gozo],">=14"') + '+IF(N([@Maior parcela anterior])>=14,1,0))'),
        T("Téc n menor5", '=IF([@ID do período]="",0,' + cntprog('T_Prog[Téc plano],1,T_Prog[Dias de gozo],"<5"') + '+IF(AND(N([@Parcelas anteriores à planilha])>1,ISNUMBER([@Maior parcela anterior]),N([@Gozo anterior à planilha])-N([@Maior parcela anterior])<5*(N([@Parcelas anteriores à planilha])-1)),1,0))'),
        T("Téc restante", '=IF(NOT(ISNUMBER([@Dias de direito])),"",[@Dias de direito]-[@Gozo confirmado]-[@Gozo reservado]-[@Abono confirmado]-[@Abono reservado]-[@Demanda solicitada])'),
        T("Téc frac", frac),
        T("Téc frac cor", '=IF([@Téc frac]=0,"",IF([@Téc frac]>=31,1,IF([@Téc frac]>=21,3,4)))'),
        T("Téc fracionado", '=IF(AND(ISNUMBER([@Téc restante]),OR([@Téc n plano]>=2,AND([@Téc n plano]=1,N([@Téc restante])>0))),1,0)'),
        T("Téc abono qtd", '=IF([@ID do período]="",0,' + cntprog('T_Prog[Téc abono dias],">0",T_Prog[Téc plano],1') + '+IF(N([@Abono anterior à planilha])>0,1,0))'),
        T("Téc abono total", '=IF([@ID do período]="",0,N([@Abono confirmado])+N([@Abono reservado])+' + sumprog("Téc abono dias", 'T_Prog[Téc efeito abono],"DEMANDA"') + ')'),
        T("Téc abono excesso", '=IF(AND(ISNUMBER([@Dias de direito]),[@Téc abono total]>INT(N([@Dias de direito])/3)),1,0)'),
        T("Téc código", code),
        T("Téc cor", f'=IF([@Téc código]=0,"",{cor})'),
        T("Téc G", f'=IF([@Téc código]=0,0,{G})'),
        T("Téc resp", '=IF([@Responsável pela conferência]<>"",[@Responsável pela conferência]&"",IF([@Téc func]=0,"",' + idxt("T_Func[Responsável pelo controle]", "[@Téc func]") + '))'),
        T("Téc pontuação", '=' + score("[@Téc G]", "[@Prazo da ação]", 1)),
        T("Téc ficha", '=IF(AND(FichaVinc<>"",[@ID do vínculo]=FichaVinc),COUNTIFS([ID do vínculo],FichaVinc,[Téc linha],"<="&[@Téc linha]),"")'),
    ]


# ---------------------------------------------------------------- Programação
def _msg_prog(*forms):
    """Troca os textos fixos das mensagens por INDEX na lista central (fórmulas menores)."""
    import re
    lst = []
    out = []
    for f in forms:
        def sub(m):
            t = m.group(1)
            if t not in lst:
                lst.append(t)
            return f"INDEX(M_Prog_T,{lst.index(t) + 1})"
        out.append(re.sub(r'"([^"]+; )"', sub, f))
    msgs("Prog", [(t, "", 0, 0) for t in lst])
    return out


def prog_cols():
    ini, fim, S = "[@Data de início]", "[@Término]", "[@Téc S]"
    uf, loc = "[@Téc UF]", "[@Téc local]"
    imp = ('=IF([@Téc ativo]=0,"",'
           'IF(OR([@ID da programação]="",[@ID do vínculo]="",[@ID do período]="",[@Téc S]=0,NOT(ISNUMBER([@Data de início])),NOT(ISNUMBER([@Dias de gozo]))),"Preencher campos essenciais; ","")'
           '&IF(AND([@ID da programação]<>"",COUNTIF([ID da programação],[@ID da programação])>1),"ID da programação repetido; ","")'
           '&IF(AND([@ID do vínculo]<>"",[@Téc func]=0),"Vínculo não encontrado; ","")'
           '&IF(AND([@ID do período]<>"",[@Téc per]=0),"Período não encontrado; ","")'
           '&IF(AND([@Téc func]>0,[@Téc per]>0,[@Téc per vínculo]<>[@ID do vínculo]),"Período de outro vínculo; ","")'
           '&IF(AND(ISNUMBER([@Dias de gozo]),N([@Dias de gozo])<=0),"Dias de gozo devem ser maiores que zero; ","")'
           '&IF([@Téc dup]>1,"Programação duplicada; ","")'
           '&IF([@Téc sobrep]>0,"Sobreposição com outra parcela do mesmo vínculo; ","")'
           '&IF(AND([@Téc vok]=1,OR(AND(OR([@Téc efeito]="RESERVA",[@Téc efeito]="CONSUMO"),OR(N([@Téc sd])<0,N([@Téc sng])<0)),AND([@Téc efeito]="DEMANDA",ISNUMBER([@Téc sd]),N([@Téc sd])-N([@Téc dem])<0),AND([@Téc S]=1,ISNUMBER([@Téc sd]),ISNUMBER([@Dias de gozo]),N([@Dias de gozo])+[@Téc abono dias]>N([@Téc sd])))),"Saldo insuficiente; ","")'
           '&IF(AND(ISNUMBER([@Término]),ISNUMBER([@Téc fim conc]),[@Téc S]>=1,[@Téc S]<=5),IF([@Término]>[@Téc fim conc],"Termina após o fim do concessivo; ",""),"")'
           '&IF(AND([@Téc S]>=1,[@Téc S]<=5,ISNUMBER([@Término])),IF(OR(AND(ISNUMBER([@Téc deslig]),[@Término]>N([@Téc deslig])),AND([@Téc sit vínc]="Desligado",NOT(ISNUMBER([@Téc deslig])),[@Téc S]<=3)),"Vínculo desligado; ",""),"")'
           '&IF(AND([@Téc plano]=1,[@Téc frac]>=31),"Fracionamento: "&[@Téc frac texto]&"; ","")'
           '&IF(AND([@Téc abono dias]>0,[@Téc abono excesso]=1),"Abono acima de 1/3 do direito; ","")'
           '&IF(AND([@Téc abono dias]>0,[@Téc abono qtd]>1),"Abono em mais de uma programação do período; ","")'
           '&IF(AND([@Téc futura]=1,OR([@Téc fer ini]>0,[@Téc dsr ini]=1)),"Início vedado: antecede feriado ou DSR; ",""))')
    aten = ('=IF([@Téc ativo]=0,"",'
            'IF(AND([@Téc ocorr]>0,[@Téc S]>=1,[@Téc S]<=4),"Sobrepõe ocorrência incompatível; ","")'
            '&IF(AND([@Téc vok]=1,[@Téc S]>=1,[@Téc S]<=4,[@Téc dir conf]=0),"Direito não conferido; ","")'
            '&IF([@Téc regime esp]=1,"Análise específica (regime); ","")'
            '&IF(AND([@Téc futura]=1,ISNUMBER([@Téc term aq])),IF([@Data de início]<=N([@Téc term aq]),"Início antes de completar o aquisitivo; ",""),"")'
            '&IF(AND([@Téc plano]=1,[@Téc fracionado]=1,[@Concordância com fracionamento]<>"Sim"),"Registrar concordância com o fracionamento; ","")'
            '&IF([@Téc abono dias]>0,IF(NOT(ISNUMBER([@Data da solicitação do abono])),"Registrar data do pedido de abono; ",IF(AND(ISNUMBER([@Téc term aq]),[@Data da solicitação do abono]>N([@Téc term aq])-15),"Abono pedido após o prazo legal: conferir; ","")),"")'
            '&IF(AND(ISNUMBER([@Dias de abono]),N([@Dias de abono])>0,[@Situação do abono]=""),"Informar situação do abono; ","")'
            '&IF(AND([@Téc futura]=1,[@Téc escala ok]=0),"Conferir escala; ","")'
            '&IF(AND([@Téc futura]=1,[@Téc cal ok]=0),"Calendário incompleto; ","")'
            '&IF([@Téc conflito]=1,"Conflito de equipe (limite interno); ",IF([@Téc conflito]=2,"Conflito de equipe se aprovada; ",""))'
            '&IF(AND([@Situação do abono]="Confirmado",[@Téc abono dias]>0,OR([@Téc S]=1,[@Téc S]=2)),"Abono confirmado sem programação aprovada; ","")'
            '&IF(AND([@Téc S]>=3,[@Téc S]<=5,NOT(ISNUMBER([@Data da aprovação]))),"Registrar data da aprovação; ","")'
            '&IF(AND([@Téc S]=3,[@Téc prov]=0),"Providências não registradas; ","")'
            '&IF([@Téc aviso atras]=1,"Aviso pendente após o prazo legal; ","")'
            '&IF([@Téc pag atras]=1,"Pagamento não confirmado após o prazo legal; ",""))')
    imp, aten = _msg_prog(imp, aten)
    first = lambda col: f'LEFT([@{col}],FIND(";",[@{col}]&";")-1)'
    acode = ('=IF([@Téc ativo]=0,0,IF(AND([@Téc imped]<>"",[@Téc S]<>6,[@Téc S]<>1),1,IF(OR([@Téc S]=1,[@Téc S]=6),0,'
             'IF(AND([@Téc S]=4,ISNUMBER([@Término]),DataRef>[@Término]),2,IF(AND([@Téc S]=3,ISNUMBER([@Data de início]),DataRef>=[@Data de início]),3,'
             'IF([@Téc S]=2,4,IF(AND([@Téc S]=3,[@Téc prov]=0),5,IF(AND([@Téc atenção]<>"",OR([@Téc S]=2,[@Téc S]=3)),6,'
             'IF(AND(OR([@Téc S]=4,[@Téc S]=5),[@Situação do abono]="Solicitado",[@Téc abono dias]>0),7,0)))))))))')
    pa = "[@Prazo legal do aviso]"
    G = choose("[@Téc cód ação]", [1, 3, 2, f'IF(DataRef>{pa},2,3)', f'IF(DataRef>{pa},1,IF({pa}-DataRef<=7,2,3))', 3, 3])
    acao = choose("[@Téc cód ação]", ['"Corrigir: "&' + first("Téc imped"), s("Confirmar o retorno e marcar Concluída"),
                                       s("Atualizar a situação para Em gozo"),
                                       'IF([@Téc atenção]="","Analisar a solicitação","Analisar a solicitação e conferir: "&' + first("Téc atenção") + ')',
                                       s("Registrar providências (aviso e pagamento) na aba 07"), '"Conferir: "&' + first("Téc atenção"),
                                       s("Confirmar o abono")])
    pend = choose("[@Téc cód ação]", [first("Téc imped"), s("Retorno não confirmado"), s("Data de início já chegou"),
                                       s("Solicitação aguardando análise"), s("Providências não registradas"), first("Téc atenção"),
                                       s("Abono ainda não confirmado")])
    pz = f'IF(ISNUMBER({pa}),{pa},"")'
    prazo = choose("[@Téc cód ação]", [pz, f'IF(ISNUMBER({fim}),{fim},"")', f'IF(ISNUMBER({ini}),{ini},"")', pz, pz, pz,
                                        'IF(ISNUMBER([@Prazo legal do pagamento]),[@Prazo legal do pagamento],"")'])
    perf = lambda col: f'=IF([@Téc per]=0,"",INDEX(T_Per[{col}],[@Téc per]))'
    funcf = lambda col: f'=IF([@Téc func]=0,"",' + idxt(f"T_Func[{col}]", "[@Téc func]") + ')'
    st_txt = 'CHOOSE([@Téc S]+1,"","Simulação","Aguardando aprovação","","","","Não se aplica (cancelada)")'
    prov_view = lambda col: (f'=IF([@Téc ativo]=0,"",IF(AND([@Téc S]>=3,[@Téc S]<=5),IF([@Téc prov]=0,IF([@Téc S]=5,"Sem registro de providências","Providências não registradas"),'
                             f'INDEX(T_Prov[{col}],[@Téc prov])&""),{st_txt}))')
    ret_ok = 'AND([@Téc S]>=1,[@Téc S]<=4,ISNUMBER([@Término]),[@Téc esc tipo]="Fixa",LEN([@Téc máscara])=7,[@Téc máscara]<>"1111111")'
    retorno = ('=IF(OR([@Téc ativo]=0,NOT(ISNUMBER([@Término]))),"",IF(OR([@Téc S]=5,[@Téc S]=6,[@Téc S]=0),"",'
               'IF(OR([@Téc esc tipo]<>"Fixa",[@Téc escala ok]=0),"Conferir escala",IF([@Téc cal ok]=0,"Calendário incompleto",'
               f'IF(NOT(ISNUMBER([@Téc ret1])),"Conferir escala",IF({hol("[@Téc ret1]", "[@Téc ret1]", uf, loc)}>0,"Conferir escala (feriado no retorno)",[@Téc ret1]))))))')
    conf_txt = ('=IF(OR([@Téc ativo]=0,[@Téc ativa]=0),"",IF([@Téc chave equipe]="","Equipe não informada",IF(NOT(ISNUMBER([@Téc limite])),"Limite não definido",'
                'IF([@Téc conflito]=1,"Acima do limite interno ("&[@Téc limite]&")",IF([@Téc conflito]=2,"Conflito se aprovada (limite "&[@Téc limite]&")","Dentro do limite interno")))))')
    calrev = lambda y: f'COUNTIFS(T_CalRev[Ano],{y},T_CalRev[Código da localidade],[@Téc local],T_CalRev[Calendário revisado],"Sim")'
    return [
        I("ID da programação", 11, note="Identificador único da parcela. Exemplo: PG0001. Nunca reutilize um ID."),
        I("ID do vínculo", 10, dv=LIST("lst_Vinculos")),
        I("ID do período", 12, dv=LIST("lst_Periodos"), note="Escolha o período do mesmo vínculo (aba 04)."),
        C("Nome", funcf("Nome"), 22),
        C("Empresa", funcf("ID da empresa"), 8),
        C("Setor", funcf("Setor"), 12),
        C("Equipe", funcf("Equipe"), 12),
        I("Situação da programação", 12, dv=LIST("L_SitProg"),
          note="Rascunho: simulação, não reserva. Solicitada: aguarda análise, não reserva. Aprovada: reserva. Em gozo: reserva e indica ausência. Concluída: vira gozo confirmado. Cancelada: libera e preserva o registro. A planilha não muda a situação sozinha."),
        C("Nº da parcela", '=IF([@Téc plano]=0,"",N(INDEX(T_Per[Parcelas anteriores à planilha],[@Téc per]))+COUNTIFS([ID do período],[@ID do período],[ID do vínculo],[@ID do vínculo],[Téc plano],1,[Data de início],"<"&[@Data de início])+COUNTIFS([ID do período],[@ID do período],[ID do vínculo],[@ID do vínculo],[Téc plano],1,[Data de início],[@Data de início],[Téc linha],"<="&[@Téc linha]))', 8, "int",
          note="Calculado pela ordem das datas, entre as parcelas solicitadas, aprovadas, em gozo e concluídas."),
        I("Data de solicitação", 11, "date", D),
        I("Data de início", 11, "date", D),
        I("Dias de gozo", 8, "int", INT(1, 30), note="Dias corridos de descanso. Não inclua aqui os dias de abono."),
        C("Término", '=IF(AND(ISNUMBER([@Data de início]),ISNUMBER([@Dias de gozo])),IF([@Dias de gozo]>0,[@Data de início]+[@Dias de gozo]-1,""),"")', 11, "date",
          note="Início + dias de gozo - 1 (contagem inclusiva)."),
        C("Primeiro dia após o término", '=IF(ISNUMBER([@Término]),[@Término]+1,"")', 11, "date",
          note="Data de calendário. Pode não ser o dia de retorno ao trabalho."),
        C("Retorno previsto segundo escala", retorno, 13, "date",
          note="Só é calculado para escala fixa e calendário de feriados revisado. Caso contrário mostra Conferir escala ou Calendário incompleto."),
        I("Dias de abono", 8, "int", INT(0, 10), note="Dias convertidos em abono pecuniário vinculados a esta programação."),
        I("Data da solicitação do abono", 11, "date", D),
        I("Situação do abono", 11, dv=LIST("L_SitAbono"), note="Solicitado: reserva quando a programação estiver aprovada. Confirmado: consome o saldo. Cancelado: não conta."),
        I("Concordância com fracionamento", 11, dv=LIST("L_SimNao")),
        C("Gestor", funcf("Gestor"), 14),
        I("Data da aprovação", 11, "date", D),
        I("Referência do documento", 16),
        I("Programação anterior relacionada", 12, dv=LIST("lst_Prog", "warning"), note="No reagendamento, informe o ID da programação cancelada."),
        I("Motivo de cancelamento ou reagendamento", 22),
        I("Observações", 20),
        C("Prazo legal do aviso", '=IF(ISNUMBER([@Data de início]),[@Data de início]-30,"")', 11, "date", note="Data de início menos 30 dias (regra geral)."),
        C("Prazo legal do pagamento", '=IF(ISNUMBER([@Data de início]),[@Data de início]-2,"")', 11, "date", note="Data de início menos 2 dias (regra geral)."),
        C("Aviso", prov_view("Alerta do aviso"), 24, cor="Téc cor aviso"),
        C("Pagamento", prov_view("Alerta do pagamento"), 24, cor="Téc cor pag"),
        C("Conflito de equipe", conf_txt, 18, cor="Téc cor conflito"),
        C("Alertas da parcela", '=IF([@Téc ativo]=0,"",IF([@Téc imped]&[@Téc atenção]="",IF([@Téc S]=6,"Cancelada","Sem alertas na parcela"),LEFT([@Téc imped]&[@Téc atenção],LEN([@Téc imped]&[@Téc atenção])-2)))', 40),
        C("Validação do conjunto", '=IF([@Téc ativo]=0,"",IF([@Téc S]=6,"Cancelada: não reserva nem consome",IF([@Téc S]=1,"Simulação: não reserva saldo",IF([@Téc imped]<>"","Incompatível",IF(AND(OR([@Téc frac]=21,[@Téc frac]=22),ISNUMBER([@Téc fim conc])),IF(DataRef>N([@Téc fim conc]),"Incompleta: concessivo encerrado","Parcial: em construção"),IF(OR([@Téc frac]=21,[@Téc frac]=22),"Parcial: em construção",IF([@Téc atenção]<>"","Completa, com pendências de conferência","Completa e conferida segundo registros")))))))', 22, cor="Téc cor valid",
          note="Avalia esta parcela junto com as demais do mesmo período."),
        C("Próxima ação", f'=IF([@Téc cód ação]=0,"",{acao})', 30),
        C("Prazo da ação", f'=IF([@Téc cód ação]=0,"",{prazo})', 11, "date"),
        T("Téc ativo", '=IF(LEN([@ID da programação]&[@ID do vínculo]&[@ID do período]&[@Data de início]&[@Dias de gozo]&[@Situação da programação])>0,1,0)'),
        T("Téc linha", '=ROW()'),
        T("Téc func", '=IF([@ID do vínculo]="",0,IFERROR(MATCH([@ID do vínculo],T_Func[ID do vínculo],0),0))'),
        T("Téc per", '=IF([@ID do período]="",0,IFERROR(MATCH([@ID do período],T_Per[ID do período],0),0))'),
        T("Téc per vínculo", '=IF([@Téc per]=0,"",' + idxt("T_Per[ID do vínculo]", "[@Téc per]") + ')'),
        T("Téc vok", '=IF(AND([@Téc func]>0,[@Téc per]>0,[@Téc per vínculo]=[@ID do vínculo]),1,0)'),
        T("Téc S", '=IFERROR(MATCH([@Situação da programação],L_SitProg,0),0)'),
        T("Téc efeito", '=IF(OR([@Téc vok]=0,NOT(ISNUMBER([@Término]))),"NENHUM",CHOOSE([@Téc S]+1,"NENHUM","NENHUM","DEMANDA","RESERVA","RESERVA","CONSUMO","NENHUM"))'),
        T("Téc plano", '=IF(OR([@Téc efeito]="DEMANDA",[@Téc efeito]="RESERVA",[@Téc efeito]="CONSUMO"),1,0)'),
        T("Téc abono dias", '=IF(AND(ISNUMBER([@Dias de abono]),OR([@Situação do abono]="Solicitado",[@Situação do abono]="Confirmado")),IF(N([@Dias de abono])>0,[@Dias de abono],0),0)'),
        T("Téc efeito abono", '=IF(OR([@Téc abono dias]=0,[@Téc vok]=0),"NENHUM",IF([@Téc efeito]="DEMANDA","DEMANDA",IF(OR([@Téc efeito]="RESERVA",[@Téc efeito]="CONSUMO"),IF([@Situação do abono]="Confirmado","CONSUMO","RESERVA"),"NENHUM")))'),
        T("Téc ativa", '=IF(AND([@Téc func]>0,[@Téc S]>=2,[@Téc S]<=5,ISNUMBER([@Término])),1,0)'),
        T("Téc cap", '=IF(AND([@Téc ativa]=1,[@Téc S]>=3),1,0)'),
        T("Téc futura", '=IF(AND([@Téc func]>0,[@Téc S]>=1,[@Téc S]<=3,ISNUMBER([@Término])),1,0)'),
        T("Téc estab", funcf("Estabelecimento")),
        T("Téc UF", funcf("Téc UF")),
        T("Téc local", funcf("Localidade de trabalho")),
        T("Téc esc tipo", funcf("Téc esc tipo")),
        T("Téc dsr", '=IF([@Téc func]=0,0,N(INDEX(T_Func[Téc dsr],[@Téc func])))'),
        T("Téc folga", '=IF([@Téc func]=0,0,N(INDEX(T_Func[Téc folga],[@Téc func])))'),
        T("Téc folga conta", funcf("Téc folga conta")),
        T("Téc máscara", funcf("Téc máscara")),
        T("Téc deslig", '=IF([@Téc func]=0,"",' + idxv("T_Func[Data de desligamento]", "[@Téc func]") + ')', "date"),
        T("Téc sit vínc", funcf("Situação do vínculo")),
        T("Téc regime esp", '=IF([@Téc func]=0,0,IF(ISNUMBER(MATCH(INDEX(T_Func[Regime contratual],[@Téc func])&"",L_RegEsp,0)),1,0))'),
        T("Téc resp", funcf("Responsável pelo controle")),
        T("Téc term aq", perf("Término do aquisitivo"), "date"),
        T("Téc fim conc", perf("Término do concessivo"), "date"),
        T("Téc sd", perf("Saldo disponível")),
        T("Téc sng", perf("Saldo não gozado")),
        T("Téc dem", perf("Demanda solicitada")),
        T("Téc frac", '=IF([@Téc per]=0,0,N(INDEX(T_Per[Téc frac],[@Téc per])))'),
        T("Téc frac texto", perf("Avaliação do fracionamento")),
        T("Téc fracionado", '=IF([@Téc per]=0,0,N(INDEX(T_Per[Téc fracionado],[@Téc per])))'),
        T("Téc dir conf", '=IF([@Téc per]=0,0,N(INDEX(T_Per[Téc dir conferido],[@Téc per])))'),
        T("Téc abono excesso", '=IF([@Téc per]=0,0,N(INDEX(T_Per[Téc abono excesso],[@Téc per])))'),
        T("Téc abono qtd", '=IF([@Téc per]=0,0,N(INDEX(T_Per[Téc abono qtd],[@Téc per])))'),
        T("Téc dup", '=IF([@Téc ativa]=0,0,COUNTIFS([ID do vínculo],[@ID do vínculo],[Data de início],[@Data de início],[Dias de gozo],[@Dias de gozo],[Téc ativa],1))'),
        T("Téc sobrep", '=IF(OR([@Téc func]=0,NOT(ISNUMBER([@Término])),[@Téc S]=0,[@Téc S]=6),0,COUNTIFS([ID do vínculo],[@ID do vínculo],[Téc ativa],1,[Data de início],"<="&[@Término],[Término],">="&[@Data de início])-[@Téc ativa])'),
        T("Téc ocorr", '=IF(OR([@Téc func]=0,NOT(ISNUMBER([@Término]))),0,COUNTIFS(T_Oc[ID do vínculo],[@ID do vínculo],T_Oc[Téc incompatível],1,T_Oc[Início],"<="&[@Término],T_Oc[Téc término],">="&[@Data de início]))'),
        T("Téc fer ini", f'=IF([@Téc futura]=0,0,{hol(ini + "+1", ini + "+2", uf, loc)})'),
        T("Téc dsr ini", f'=IF([@Téc futura]=0,0,IF([@Téc esc tipo]="Variável",IF(COUNTIFS(T_Desc[ID do vínculo],[@ID do vínculo],T_Desc[Data de descanso],">="&({ini}+1),T_Desc[Data de descanso],"<="&({ini}+2))>0,1,0),'
                         f'IF([@Téc dsr]=0,0,IF(OR(WEEKDAY({ini}+1)=[@Téc dsr],WEEKDAY({ini}+2)=[@Téc dsr],AND([@Téc folga conta]="Sim",[@Téc folga]>0,OR(WEEKDAY({ini}+1)=[@Téc folga],WEEKDAY({ini}+2)=[@Téc folga]))),1,0))))'),
        T("Téc escala ok", f'=IF([@Téc futura]=0,1,IF([@Téc esc tipo]="Fixa",IF([@Téc dsr]>0,1,0),IF([@Téc esc tipo]="Variável",IF(COUNTIFS(T_Desc[ID do vínculo],[@ID do vínculo],T_Desc[Data de descanso],">="&({ini}-7),T_Desc[Data de descanso],"<="&({fim}+7))>0,1,0),0)))'),
        T("Téc cal ok", f'=IF(AND([@Téc futura]=0,[@Téc S]<>4),1,IF([@Téc local]="",0,IF(NOT(ISNUMBER({fim})),0,IF(AND({calrev("YEAR(" + ini + ")")}>0,{calrev("YEAR(" + fim + "+1)")}>0),1,0))))'),
        T("Téc ret1", f'=IF({ret_ok},WORKDAY.INTL([@Término],1,[@Téc máscara]),"")', "date"),
        T("Téc chave equipe", funcf("Téc chave equipe")),
        T("Téc limite", '=IF([@Téc func]=0,"",INDEX(T_Func[Téc limite],[@Téc func]))'),
        T("Téc qtd início", '=IF(OR([@Téc ativa]=0,[@Téc chave equipe]=""),"",COUNTIFS([Téc chave equipe],[@Téc chave equipe],[Téc cap],1,[Data de início],"<="&[@Data de início],[Término],">="&[@Data de início]))'),
        T("Téc conflito", '=IF(OR([@Téc ativa]=0,[@Téc chave equipe]="",NOT(ISNUMBER([@Téc limite]))),0,IF([@Téc cap]=1,IF(COUNTIFS([Téc chave equipe],[@Téc chave equipe],[Téc cap],1,[Data de início],">="&[@Data de início],[Data de início],"<="&[@Término],[Téc qtd início],">"&[@Téc limite])>0,1,0),'
                          'IF(OR(N([@Téc qtd início])+1>[@Téc limite],COUNTIFS([Téc chave equipe],[@Téc chave equipe],[Téc cap],1,[Data de início],">="&[@Data de início],[Data de início],"<="&[@Término],[Téc qtd início],">="&[@Téc limite])>0),2,0)))'),
        T("Téc cor conflito", '=IF([@Conflito de equipe]="","",IF([@Téc conflito]=1,2,IF([@Téc conflito]=2,2,IF([@Conflito de equipe]="Dentro do limite interno",4,2))))'),
        T("Téc prov", '=IF([@ID da programação]="",0,IFERROR(MATCH([@ID da programação],T_Prov[ID da programação],0),0))'),
        T("Téc cor aviso", '=IF([@Aviso]="","",IF(AND([@Téc S]>=3,[@Téc S]<=5),IF([@Téc prov]=0,IF([@Téc S]=5,5,IF(DataRef>N([@Prazo legal do aviso]),1,2)),INDEX(T_Prov[Téc cor aviso],[@Téc prov])),IF([@Téc S]=2,3,5)))'),
        T("Téc cor pag", '=IF([@Pagamento]="","",IF(AND([@Téc S]>=3,[@Téc S]<=5),IF([@Téc prov]=0,IF([@Téc S]=5,5,IF(DataRef>N([@Prazo legal do pagamento]),1,2)),INDEX(T_Prov[Téc cor pag],[@Téc prov])),IF([@Téc S]=2,3,5)))'),
        T("Téc imped", imp),
        T("Téc atenção", aten),
        T("Téc cor valid", '=IF([@Validação do conjunto]="","",IF([@Téc S]=6,5,IF([@Téc S]=1,5,IF([@Téc imped]<>"",1,IF([@Validação do conjunto]="Incompleta: concessivo encerrado",1,IF(OR([@Téc frac]=21,[@Téc frac]=22),3,IF([@Téc atenção]<>"",2,4)))))))'),
        T("Téc cód ação", acode),
        T("Téc G", f'=IF([@Téc cód ação]=0,0,{G})'),
        T("Téc pendência", f'=IF([@Téc cód ação]=0,"",{pend})'),
        T("Téc pontuação", '=' + score("[@Téc G]", "[@Prazo da ação]", 2)),
        T("Téc aviso pend", '=IF(AND(OR([@Téc S]=3,[@Téc S]=4),[@Téc vok]=1),IF([@Téc prov]=0,1,IF(INDEX(T_Prov[Data de entrega do aviso],[@Téc prov])="",1,0)),0)'),
        T("Téc aviso atras", '=IF(AND([@Téc aviso pend]=1,ISNUMBER([@Prazo legal do aviso])),IF(DataRef>[@Prazo legal do aviso],1,0),0)'),
        T("Téc pag pend", '=IF(AND(OR([@Téc S]=3,[@Téc S]=4),[@Téc vok]=1),IF([@Téc prov]=0,1,IF(INDEX(T_Prov[Situação do pagamento],[@Téc prov])&""="Confirmado",0,1)),0)'),
        T("Téc pag atras", '=IF(AND([@Téc pag pend]=1,ISNUMBER([@Prazo legal do pagamento])),IF(DataRef>[@Prazo legal do pagamento],1,0),0)'),
        T("Téc cal", '=IF(AND([@Téc ativa]=1,ISNUMBER(CalM1)),IF(AND([@Data de início]<=CalM2,[@Término]>=CalM1,OR(CalSolic="Sim",[@Téc S]<>2),OR(CalEmp="(Todas)",[@Empresa]=CalEmp),OR(CalEst="(Todos)",[@Téc estab]=CalEst),OR(CalSetor="(Todos)",[@Setor]=CalSetor),OR(CalEquipe="(Todas)",[@Equipe]=CalEquipe)),1,0),0)'),
        T("Téc cal seq", '=IF([@Téc cal]=1,COUNTIFS([Téc cal],1,[Data de início],"<"&[@Data de início])+COUNTIFS([Téc cal],1,[Data de início],[@Data de início],[Téc linha],"<="&[@Téc linha]),"")'),
        T("Téc ficha", '=IF(AND(FichaVinc<>"",[@ID do vínculo]=FichaVinc),COUNTIFS([ID do vínculo],FichaVinc,[Téc linha],"<="&[@Téc linha]),"")'),
    ]


# ---------------------------------------------------------------- Providências
def prov_cols():
    S, pa, pp = "[@Téc S]", "[@Prazo legal do aviso]", "[@Prazo legal do pagamento]"
    pf = lambda col: f'=IF([@Téc prog]=0,"",' + idxt(f"T_Prog[{col}]", "[@Téc prog]") + ')'
    pv = lambda col: f'=IF([@Téc prog]=0,"",' + idxv(f"T_Prog[{col}]", "[@Téc prog]") + ')'
    av = ('=IF([@Téc ativo]=0,0,IF(OR([@ID da programação]="",[@Téc prog]=0),1,IF(COUNTIF([ID da programação],[@ID da programação])>1,2,'
          'IF([@Téc S]=6,3,IF([@Téc S]=1,4,IF([@Téc S]=2,5,IF([@Téc S]=0,1,IF(NOT(ISNUMBER([@Prazo legal do aviso])),1,'
          'IF([@Data de entrega do aviso]="",IF(DataRef>[@Prazo legal do aviso],IF([@Téc S]=5,6,7),IF(OR(DataRef>=[@Prazo legal do aviso]-7,AND(ISNUMBER([@Data interna prevista do aviso]),DataRef>N([@Data interna prevista do aviso]))),8,9)),'
          'IF([@Data de entrega do aviso]>[@Prazo legal do aviso],10,IF([@Data da ciência do empregado]="",11,IF([@Conteúdo do aviso conferido]<>"Sim",12,13))))))))))))')
    msgs("Aviso", [
        ("Programação não encontrada", "Corrigir o ID da programação", 1, 1),
        ("Linha repetida para a programação", "Manter uma linha por programação", 1, 1),
        ("Não se aplica (cancelada)", "", 0, 5),
        ("Simulação", "", 0, 5),
        ("Aguardando aprovação", "", 0, 3),
        ("Registrar o aviso entregue", "Registrar a data de entrega", 3, 2),
        ("Aviso atrasado: entregar e registrar", "Entregar o aviso e registrar", 1, 1),
        ("Entregar aviso até {x}", "Entregar o aviso", 2, 2),
        ("Entregar aviso até {x}", "Entregar o aviso", 4, 3),
        ("Aviso entregue com menos de 30 dias: conferir", "Conferir o aviso com o responsável", 2, 1),
        ("Registrar ciência do empregado", "Registrar a ciência", 3, 2),
        ("Conferir conteúdo do aviso", "Conferir o conteúdo do aviso", 3, 2),
        ("Aviso entregue e conferido", "", 0, 4),
    ])
    ca = "[@Téc cód aviso]"
    av_txt = mt("Aviso", ca, dtxt(pa))
    av_acao = ma("Aviso", ca)
    av_G = mg("Aviso", ca)
    av_cor = mc("Aviso", ca)
    av_pz = choose("[@Téc cód aviso]", ['""'] * 5 + [pa] * 4 + ['""', pa, pa, '""'])
    pg = ('=IF([@Téc ativo]=0,0,IF(OR([@ID da programação]="",[@Téc prog]=0,COUNTIF([ID da programação],[@ID da programação])>1,[@Téc S]=0,NOT(ISNUMBER([@Prazo legal do pagamento]))),1,'
          'IF([@Téc S]=6,2,IF([@Téc S]=1,3,IF([@Téc S]=2,4,'
          'IF(OR([@Situação do pagamento]="",[@Situação do pagamento]="Previsto"),IF(DataRef>[@Prazo legal do pagamento],IF([@Téc S]=5,5,6),IF(OR(DataRef>=[@Prazo legal do pagamento]-5,AND(ISNUMBER([@Data interna prevista do pagamento]),DataRef>N([@Data interna prevista do pagamento]))),7,8)),'
          'IF([@Situação do pagamento]="Agendado",IF(AND(ISNUMBER([@Data agendada]),N([@Data agendada])>[@Prazo legal do pagamento]),9,IF(DataRef>[@Prazo legal do pagamento],10,IF(NOT(ISNUMBER([@Data agendada])),11,12))),'
          'IF(NOT(ISNUMBER([@Data do pagamento realizado])),13,IF([@Data do pagamento realizado]>[@Prazo legal do pagamento],14,IF([@Situação do pagamento]="Realizado",15,IF(NOT(ISNUMBER([@Data da confirmação do pagamento])),16,17))))))))))')
    msgs("Pag", [
        ("Conferir o ID da programação", "", 0, 1),
        ("Não se aplica (cancelada)", "", 0, 5),
        ("Simulação", "", 0, 5),
        ("Aguardando aprovação", "", 0, 3),
        ("Registrar o pagamento realizado", "Registrar o pagamento", 2, 2),
        ("Pagamento não registrado após o prazo legal", "Verificar o pagamento com o financeiro", 1, 1),
        ("Realizar pagamento até {x}", "Agendar ou realizar o pagamento", 2, 2),
        ("Pagamento previsto até {x}", "Programar o pagamento", 4, 3),
        ("Agendado após o prazo legal: rever", "Antecipar o pagamento", 1, 1),
        ("Agendado: confirmar, o prazo legal já passou", "Confirmar o pagamento", 1, 1),
        ("Agendado: informar data e confirmar", "Informar a data e confirmar", 3, 2),
        ("Agendado para {x}: confirmar", "Confirmar o pagamento", 3, 2),
        ("Informar a data do pagamento", "Informar a data do pagamento", 2, 2),
        ("Pago após o prazo legal: conferir", "Registrar a análise do atraso (sem cálculo automático)", 2, 1),
        ("Realizado: confirmar o pagamento", "Confirmar o pagamento", 3, 2),
        ("Registrar a data da confirmação", "Registrar a confirmação", 3, 2),
        ("Pagamento confirmado", "", 0, 4),
    ])
    cp = "[@Téc cód pag]"
    pg_txt = mt("Pag", cp, f'IF({cp}=12,{dtxt("[@Data agendada]")},{dtxt(pp)})')
    pg_acao = ma("Pag", cp)
    pg_G = mg("Pag", cp)
    pg_cor = mc("Pag", cp)
    pg_pz = choose("[@Téc cód pag]", ['""'] * 4 + [pp] * 9 + ['""', pp, pp, '""'])
    itens = ('IF(AND([@Téc S]>=3,[@Téc S]<=5),'
             'IF([@Téc dir conf]=0,"Conferir direito; ","")'
             '&IF([@Téc data aprov]="","Registrar data da aprovação; ","")'
             '&IF(AND([@Téc fracionado]=1,[@Téc concord]<>"Sim"),"Registrar concordância; ","")'
             '&IF(AND([@Téc abono dias]>0,[@Téc data abono]=""),"Registrar pedido de abono; ","")'
             '&IF([@Data da conferência de valores]="","Conferir valores; ","")'
             '&IF([@Data do registro no sistema]="","Registrar no sistema; ","")'
             '&IF(AND([@Téc S]>=4,[@Data do arquivamento]=""),"Arquivar documentos; ","")'
             '&IF(AND([@Data do arquivamento]<>"",[@Documentos arquivados conferidos]<>"Sim"),"Conferir documentos arquivados; ","")'
             '&IF(AND([@Téc S]=5,[@Data de conclusão das providências]=""),"Registrar conclusão; ",""),"")')
    return [
        I("ID da programação", 11, dv=LIST("lst_Prog"), note="Use uma linha por programação da aba 05.", group="Programação"),
        C("Nome", pf("Nome"), 22, group="Programação"),
        C("Empresa", pf("Empresa"), 8, group="Programação"),
        C("Situação da programação", pf("Situação da programação"), 11, group="Programação"),
        C("Início das férias", pv("Data de início"), 11, "date", group="Programação"),
        C("Conferência do direito", '=IF([@Téc prog]=0,"",IF([@Téc dir conf]=1,"Conferido","Pendente de conferência"))', 13, group="Etapas anteriores"),
        C("Aprovação", '=IF([@Téc prog]=0,"",IF(AND([@Téc S]>=3,[@Téc S]<=5),IF(ISNUMBER([@Téc data aprov]),"Aprovada em "&' + dtxt("[@Téc data aprov]") + ',"Aprovada, sem data registrada"),IF([@Téc S]=2,"Aguardando",IF([@Téc S]=6,"Cancelada","Não se aplica"))))', 16, group="Etapas anteriores"),
        C("Concordância com fracionamento", '=IF([@Téc prog]=0,"",IF([@Téc fracionado]=1,IF([@Téc concord]="Sim","Registrada","Pendente"),"Não se aplica"))', 12, group="Etapas anteriores"),
        C("Solicitação de abono", '=IF([@Téc prog]=0,"",IF([@Téc abono dias]>0,[@Téc sit abono]&IF(ISNUMBER([@Téc data abono])," em "&' + dtxt("[@Téc data abono]") + '," (sem data)"),"Sem abono"))', 16, group="Etapas anteriores"),
        C("Prazo legal do aviso", '=IF(ISNUMBER([@Início das férias]),[@Início das férias]-30,"")', 11, "date", group="Aviso de férias", note="Início menos 30 dias (CLT, art. 135)."),
        I("Data interna prevista do aviso", 11, "date", D, group="Aviso de férias", note="Data interna da empresa. Não substitui o prazo legal."),
        I("Data de entrega do aviso", 11, "date", D, group="Aviso de férias"),
        I("Responsável pelo aviso", 14, dv=LIST("lst_Resp", "warning"), group="Aviso de férias"),
        I("Evidência do aviso", 16, group="Aviso de férias", note="Link ou referência do documento. Um link sozinho não indica que o conteúdo foi conferido."),
        I("Data da ciência do empregado", 11, "date", D, group="Aviso de férias", note="Recebimento do aviso pelo empregado."),
        I("Conteúdo do aviso conferido", 10, dv=LIST("L_SimNao"), group="Aviso de férias"),
        C("Alerta do aviso", f'=IF([@Téc cód aviso]=0,"",{av_txt})', 26, cor="Téc cor aviso", group="Aviso de férias"),
        I("Data da conferência de valores", 11, "date", D, group="Valores e pagamento"),
        I("Responsável pela conferência de valores", 14, dv=LIST("lst_Resp", "warning"), group="Valores e pagamento"),
        C("Prazo legal do pagamento", '=IF(ISNUMBER([@Início das férias]),[@Início das férias]-2,"")', 11, "date", group="Valores e pagamento", note="Início menos 2 dias (CLT, art. 145)."),
        I("Data interna prevista do pagamento", 11, "date", D, group="Valores e pagamento"),
        I("Situação do pagamento", 11, dv=LIST("L_SitPag"), group="Valores e pagamento",
          note="Previsto: ainda não agendado. Agendado: programado no banco, sem confirmação. Realizado: pago, falta comprovante conferido. Confirmado: pagamento conferido."),
        I("Data agendada", 11, "date", D, group="Valores e pagamento"),
        I("Data do pagamento realizado", 11, "date", D, group="Valores e pagamento"),
        I("Data da confirmação do pagamento", 11, "date", D, group="Valores e pagamento"),
        I("Responsável pelo pagamento", 14, dv=LIST("lst_Resp", "warning"), group="Valores e pagamento"),
        I("Evidência do pagamento", 16, group="Valores e pagamento"),
        C("Alerta do pagamento", f'=IF([@Téc cód pag]=0,"",{pg_txt})', 26, cor="Téc cor pag", group="Valores e pagamento"),
        I("Data do registro no sistema", 11, "date", D, group="Registro e arquivo", note="Registro no sistema de folha usado pela empresa."),
        I("Evidência do registro", 14, group="Registro e arquivo"),
        I("Data do arquivamento", 11, "date", D, group="Registro e arquivo"),
        I("Referência do arquivo", 16, group="Registro e arquivo"),
        I("Documentos arquivados conferidos", 10, dv=LIST("L_SimNao"), group="Registro e arquivo"),
        I("Data de conclusão das providências", 11, "date", D, group="Registro e arquivo"),
        I("Observação", 20, group="Registro e arquivo"),
        C("Alerta das demais etapas", f'=IF(OR([@Téc ativo]=0,[@Téc prog]=0),"",IF([@Téc itens]="",IF(AND([@Téc S]>=3,[@Téc S]<=5),"Sem pendências nas demais etapas","Não se aplica"),"Pendente: "&LEFT([@Téc itens],LEN([@Téc itens])-2)))', 30, cor="Téc cor demais", group="Situação"),
        C("Situação geral", '=IF(OR([@Téc ativo]=0,[@Téc cód aviso]=0),"",CHOOSE([@Téc cor geral],"Com pendência crítica","Com pendências","Em acompanhamento",IF(AND([@Téc S]=5,ISNUMBER([@Data de conclusão das providências])),"Concluídas segundo registros","Em acompanhamento"),"Não se aplica"))', 18, cor="Téc cor geral", group="Situação"),
        T("Téc ativo", '=IF(LEN([@ID da programação]&[@Data de entrega do aviso]&[@Situação do pagamento]&[@Data do pagamento realizado])>0,1,0)'),
        T("Téc linha", '=ROW()'),
        T("Téc prog", '=IF([@ID da programação]="",0,IFERROR(MATCH([@ID da programação],T_Prog[ID da programação],0),0))'),
        T("Téc S", '=IF([@Téc prog]=0,0,N(INDEX(T_Prog[Téc S],[@Téc prog])))'),
        T("Téc dir conf", '=IF([@Téc prog]=0,0,N(INDEX(T_Prog[Téc dir conf],[@Téc prog])))'),
        T("Téc fracionado", '=IF([@Téc prog]=0,0,N(INDEX(T_Prog[Téc fracionado],[@Téc prog])))'),
        T("Téc concord", pf("Concordância com fracionamento")),
        T("Téc abono dias", '=IF([@Téc prog]=0,0,N(INDEX(T_Prog[Téc abono dias],[@Téc prog])))'),
        T("Téc sit abono", pf("Situação do abono")),
        T("Téc data abono", pv("Data da solicitação do abono"), "date"),
        T("Téc data aprov", pv("Data da aprovação"), "date"),
        T("Téc resp func", pf("Téc resp")),
        T("Téc cód aviso", av),
        T("Téc cor aviso", f'=IF([@Téc cód aviso]=0,"",{av_cor})'),
        T("Téc G aviso", f'=IF([@Téc cód aviso]=0,0,{av_G})'),
        T("Téc ação aviso", f'=IF([@Téc cód aviso]=0,"",{av_acao})'),
        T("Téc prazo aviso", f'=IF([@Téc cód aviso]=0,"",{av_pz})', "date"),
        T("Téc resp aviso", '=IF([@Responsável pelo aviso]<>"",[@Responsável pelo aviso]&"",[@Téc resp func])'),
        T("Téc pont aviso", '=' + score("[@Téc G aviso]", "[@Téc prazo aviso]", 3)),
        T("Téc cód pag", pg),
        T("Téc cor pag", f'=IF([@Téc cód pag]=0,"",{pg_cor})'),
        T("Téc G pag", f'=IF([@Téc cód pag]=0,0,{pg_G})'),
        T("Téc ação pag", f'=IF([@Téc cód pag]=0,"",{pg_acao})'),
        T("Téc prazo pag", f'=IF([@Téc cód pag]=0,"",{pg_pz})', "date"),
        T("Téc resp pag", '=IF([@Responsável pelo pagamento]<>"",[@Responsável pelo pagamento]&"",[@Téc resp func])'),
        T("Téc pont pag", '=' + score("[@Téc G pag]", "[@Téc prazo pag]", 4)),
        T("Téc itens", '=IF(OR([@Téc ativo]=0,[@Téc prog]=0),"",' + itens + ')'),
        T("Téc G demais", '=IF(OR([@Téc itens]="",[@Téc cód aviso]<=2),0,IF(AND(OR([@Data da conferência de valores]="",[@Data do registro no sistema]=""),ISNUMBER([@Prazo legal do pagamento]),DataRef>N([@Prazo legal do pagamento])),2,IF(OR([@Téc dir conf]=0,[@Data da conferência de valores]="",[@Data do registro no sistema]=""),3,4)))'),
        T("Téc cor demais", '=IF([@Alerta das demais etapas]="","",IF([@Téc itens]="",IF(AND([@Téc S]>=3,[@Téc S]<=5),4,5),IF([@Téc G demais]<=2,1,2)))'),
        T("Téc ação demais", '=IF([@Téc itens]="","",LEFT([@Téc itens],FIND(";",[@Téc itens])-1))'),
        T("Téc prazo demais", '=IF(OR([@Téc itens]="",NOT(ISNUMBER([@Prazo legal do pagamento]))),"",IF(OR([@Data da conferência de valores]="",[@Data do registro no sistema]=""),[@Prazo legal do pagamento],""))', "date"),
        T("Téc resp demais", '=IF([@Responsável pela conferência de valores]<>"",[@Responsável pela conferência de valores]&"",[@Téc resp func])'),
        T("Téc pont demais", '=' + score("[@Téc G demais]", "[@Téc prazo demais]", 5)),
        T("Téc cor geral", '=IF([@Téc cód aviso]=0,"",MIN(N([@Téc cor aviso]),IF([@Téc cor pag]="",5,[@Téc cor pag]),IF([@Téc cor demais]="",5,[@Téc cor demais])))'),
    ]


# ---------------------------------------------------------------- Ocorrências
def oc_cols():
    code = ('=IF([@Téc ativo]=0,0,IF(OR([@ID da ocorrência]="",[@ID do vínculo]="",[@Tipo]="",NOT(ISNUMBER([@Início]))),1,'
            'IF(COUNTIF([ID da ocorrência],[@ID da ocorrência])>1,2,IF([@Téc func]=0,3,'
            'IF(AND([@ID do período afetado]<>"",OR([@Téc per]=0,[@Téc per vínculo]<>[@ID do vínculo])),4,'
            'IF(AND(ISNUMBER([@Término]),N([@Término])<[@Início]),5,'
            'IF(AND([@Tipo]="Férias coletivas",[@Situação da análise]<>"Concluída",[@Situação da análise]<>"Não aplicável"),6,'
            'IF(AND([@Téc pendente]=1,[@Análise necessária]=""),7,IF([@Téc pendente]=1,8,'
            'IF([@Situação da análise]="Concluída",IF(OR([@Efeito confirmado]="",[@Responsável]="",NOT(ISNUMBER([@Data da conclusão]))),9,'
            'IF(AND(OR([@Efeito confirmado]="Reduz o direito",[@Efeito confirmado]="Perda do direito (art. 133)",[@Efeito confirmado]="Altera datas do período"),NOT(ISNUMBER([@Direito ajustado])),NOT(ISNUMBER([@Data ajustada]))),10,11)),12))))))))))')
    msgs("Oc", [
        ("Preencher ID, vínculo, tipo e início", "Completar o registro", 1, 1),
        ("ID da ocorrência repetido", "Corrigir o ID", 1, 1),
        ("Vínculo não encontrado", "Corrigir o vínculo", 1, 1),
        ("Período não encontrado ou de outro vínculo", "Corrigir o período afetado", 1, 1),
        ("Término antes do início", "Corrigir as datas", 1, 1),
        ("Férias coletivas: tratar fora do controle individual", "Analisar as férias coletivas à parte", 2, 2),
        ("Definir se há análise necessária", "Definir se precisa de análise", 2, 2),
        ("Aguardando análise", "Analisar o efeito no direito e no período", 2, 2),
        ("Registrar efeito, responsável e data", "Completar o registro da análise", 3, 2),
        ("Registrar o ajuste confirmado", "Registrar o ajuste confirmado", 3, 2),
        ("Análise concluída segundo registros", "", 0, 4),
        ("Sem análise necessária", "", 0, 5),
    ])
    cd = "[@Téc código]"
    txt = mt("Oc", cd)
    acao = ma("Oc", cd)
    G = mg("Oc", cd)
    cor = mc("Oc", cd)
    return [
        I("ID da ocorrência", 11, note="Exemplo: OC0001."),
        I("ID do vínculo", 10, dv=LIST("lst_Vinculos")),
        C("Nome", '=IF([@Téc func]=0,"",' + idxt("T_Func[Nome]", "[@Téc func]") + ')', 22),
        C("Empresa", '=IF([@Téc func]=0,"",' + idxt("T_Func[ID da empresa]", "[@Téc func]") + ')', 8),
        I("ID do período afetado", 12, dv=LIST("lst_Periodos"), note="Opcional. Vazio: a planilha procura o período cujo aquisitivo se sobrepõe às datas da ocorrência."),
        I("Tipo", 28, dv=LIST("lst_TiposOc")),
        I("Início", 11, "date", D),
        I("Término", 11, "date", D, note="Deixe vazio quando a ocorrência ainda estiver em aberto."),
        I("Referência do documento", 16, note="Não registre diagnóstico médico. Use apenas a referência do documento."),
        I("Análise necessária", 10, dv=LIST("L_SimNao"), note="Vazio: a planilha usa a indicação do tipo (aba 02)."),
        I("Situação da análise", 11, dv=LIST("L_SitAnal")),
        I("Efeito confirmado", 18, dv=LIST("L_Efeito")),
        I("Data ajustada", 11, "date", D, note="Nova data do período aquisitivo, quando a análise concluir que ela muda. Registre o mesmo ajuste na aba 04."),
        I("Direito ajustado", 9, "int", INT(0, 30), note="Direito em dias definido pela análise. Registre o mesmo valor na aba 04."),
        I("Responsável", 14, dv=LIST("lst_Resp", "warning")),
        I("Data da conclusão", 11, "date", D),
        I("Justificativa", 26),
        C("Orientação do tipo", '=IF([@Téc tipo]=0,"",' + idxt("T_TiposOc[Orientação]", "[@Téc tipo]") + ')', 34),
        C("Alerta da ocorrência", f'=IF([@Téc código]=0,"",{txt})', 28, cor="Téc cor"),
        C("Próxima ação", f'=IF([@Téc código]=0,"",{acao})', 26),
        T("Téc ativo", '=IF(LEN([@ID da ocorrência]&[@ID do vínculo]&[@Tipo]&[@Início])>0,1,0)'),
        T("Téc linha", '=ROW()'),
        T("Téc func", '=IF([@ID do vínculo]="",0,IFERROR(MATCH([@ID do vínculo],T_Func[ID do vínculo],0),0))'),
        T("Téc per", '=IF([@ID do período afetado]="",0,IFERROR(MATCH([@ID do período afetado],T_Per[ID do período],0),0))'),
        T("Téc per vínculo", '=IF([@Téc per]=0,"",' + idxt("T_Per[ID do vínculo]", "[@Téc per]") + ')'),
        T("Téc tipo", '=IF([@Tipo]="",0,IFERROR(MATCH([@Tipo],T_TiposOc[Tipo de ocorrência],0),0))'),
        T("Téc afeta", '=IF([@Téc tipo]=0,"Sim",' + idxt("T_TiposOc[Pode afetar o direito ou o período]", "[@Téc tipo]") + ')'),
        T("Téc incompatível", '=IF(OR([@Téc ativo]=0,[@Situação da análise]="Não aplicável",[@Téc tipo]=0),0,IF(INDEX(T_TiposOc[Incompatível com gozo de férias],[@Téc tipo])&""="Sim",1,0))'),
        T("Téc término", '=IF(ISNUMBER([@Término]),[@Término],IF(ISNUMBER([@Início]),2958465,""))'),
        T("Téc sem período", '=IF(AND([@Téc ativo]=1,[@ID do período afetado]=""),1,0)'),
        T("Téc pendente", '=IF([@Téc ativo]=0,0,IF(OR([@Situação da análise]="Concluída",[@Situação da análise]="Não aplicável"),0,IF(OR([@Análise necessária]="Sim",AND([@Análise necessária]="",[@Téc afeta]="Sim")),1,0)))'),
        T("Téc concluída", '=IF(AND([@Téc ativo]=1,[@Situação da análise]="Concluída"),1,0)'),
        T("Téc tem direito", '=IF(ISNUMBER([@Direito ajustado]),1,0)'),
        T("Téc código", code),
        T("Téc cor", f'=IF([@Téc código]=0,"",{cor})'),
        T("Téc G", f'=IF([@Téc código]=0,0,{G})'),
        T("Téc resp", '=IF([@Responsável]<>"",[@Responsável]&"",IF([@Téc func]=0,"",' + idxt("T_Func[Responsável pelo controle]", "[@Téc func]") + '))'),
        T("Téc pontuação", '=' + score("[@Téc G]", '""', 6)),
        T("Téc ficha", '=IF(AND(FichaVinc<>"",[@ID do vínculo]=FichaVinc),COUNTIFS([ID do vínculo],FichaVinc,[Téc linha],"<="&[@Téc linha]),"")'),
    ]


# ---------------------------------------------------------------- Estimativa
def est_cols():
    pf = lambda col: f'=IF([@Téc prog]=0,"",' + idxt(f"T_Prog[{col}]", "[@Téc prog]") + ')'
    return [
        I("ID da programação", 11, dv=LIST("lst_Prog")),
        C("ID do vínculo", pf("ID do vínculo"), 10),
        C("Nome", pf("Nome"), 22),
        C("Situação da programação", pf("Situação da programação"), 11),
        C("Dias de gozo", '=IF([@Téc prog]=0,"",N(INDEX(T_Prog[Dias de gozo],[@Téc prog])))', 8, "int"),
        C("Dias de abono", '=IF([@Téc prog]=0,"",N(INDEX(T_Prog[Téc abono dias],[@Téc prog])))', 8, "int",
          note="Somente abono com situação Solicitado ou Confirmado."),
        I("Referência salarial", 16, note="Exemplo: salário de outubro de 2026."),
        I("Tipo de remuneração", 11, dv=LIST("L_TipoRem")),
        I("Salário informado", 12, "money", MONEY),
        I("Médias e adicionais apurados", 12, "money", MONEY, note="Valor mensal já apurado pelo usuário. A planilha não calcula médias."),
        C("Base mensal considerada", '=IF(OR([@Téc ativo]=0,NOT(ISNUMBER([@Salário informado]))),"",[@Salário informado]+N([@Médias e adicionais apurados]))', 12, "money"),
        C("Remuneração estimada do gozo", '=IF(NOT(ISNUMBER([@Base mensal considerada])),"",ROUND([@Base mensal considerada]/30*N([@Dias de gozo]),2))', 12, "money"),
        C("Terço do gozo", '=IF(NOT(ISNUMBER([@Remuneração estimada do gozo])),"",ROUND([@Remuneração estimada do gozo]/3,2))', 11, "money"),
        C("Valor estimado do abono", '=IF(NOT(ISNUMBER([@Base mensal considerada])),"",ROUND([@Base mensal considerada]/30*N([@Dias de abono]),2))', 12, "money"),
        C("Terço do abono", '=IF(NOT(ISNUMBER([@Valor estimado do abono])),"",ROUND([@Valor estimado do abono]/3,2))', 11, "money"),
        I("Outros valores identificados", 12, "money", MONEY, note="Somente valores ligados às férias e já identificados. Não inclua salário do mês nem adiantamento do 13º."),
        I("Descrição dos outros valores", 18),
        C("Total bruto estimado", '=IF(NOT(ISNUMBER([@Base mensal considerada])),"",[@Remuneração estimada do gozo]+[@Terço do gozo]+[@Valor estimado do abono]+[@Terço do abono]+N([@Outros valores identificados]))', 13, "money",
          note="Valor bruto estimado. Sem INSS, IRRF, outros descontos e sem encargos da empresa."),
        I("Valor conferido na folha", 13, "money", MONEY),
        C("Diferença", '=IF(AND(ISNUMBER([@Valor conferido na folha]),ISNUMBER([@Total bruto estimado])),[@Valor conferido na folha]-[@Total bruto estimado],"")', 11, "money",
          note="Valor da folha menos a estimativa."),
        C("Metodologia", '=IF([@Téc ativo]=0,"",IF([@Tipo de remuneração]="Mensalista","Base mensal ÷ 30 × dias (mensalista)","Conferir: informe a base mensal equivalente já apurada"))', 30),
        I("Premissas e observações", 26),
        C("Alerta", '=IF([@Téc ativo]=0,"",IF([@Téc prog]=0,"Programação não encontrada",IF([@Situação da programação]="Cancelada","Programação cancelada",IF(NOT(ISNUMBER([@Salário informado])),"Informar o salário",IF([@Tipo de remuneração]<>"Mensalista","Conferir a metodologia","Estimativa bruta, sem descontos")))))', 24, cor="Téc cor"),
        T("Téc ativo", '=IF(LEN([@ID da programação]&[@Salário informado])>0,1,0)'),
        T("Téc prog", '=IF([@ID da programação]="",0,IFERROR(MATCH([@ID da programação],T_Prog[ID da programação],0),0))'),
        T("Téc cor", '=IF([@Alerta]="","",IF([@Alerta]="Estimativa bruta, sem descontos",3,IF(OR([@Alerta]="Programação não encontrada",[@Alerta]="Informar o salário"),1,2)))'),
    ]


TABLE_SHEETS = {
    "T_Func": (S_FUNC, func_cols), "T_Per": (S_PER, per_cols), "T_Prog": (S_PROG, prog_cols),
    "T_Oc": (S_OC, oc_cols), "T_Prov": (S_PROV, prov_cols), "T_Est": (S_EST, est_cols),
}


def build_tables():
    tabs = {}
    for name, (sheet, fn) in TABLE_SHEETS.items():
        tabs[name] = Table(name, sheet, fn(), CAP[name])
    # Configurações: tabelas lado a lado a partir da coluna F
    c0 = 5
    order = ["T_Empresas", "T_Estab", "T_Local", "T_Setores", "T_Equipes", "T_Cargos", "T_Gestores", "T_Resp",
             "T_Escalas", "T_Desc", "T_Feriados", "T_CalRev", "T_TiposOc", "T_Normas"]
    cfg = config_tables()
    for name in order:
        t = Table(name, S_CONFIG, cfg[name], CAP[name], hdr=HDR_ROW + 2, c0=c0)
        tabs[name] = t
        c0 = t.last_col() + 2
    return tabs, order
