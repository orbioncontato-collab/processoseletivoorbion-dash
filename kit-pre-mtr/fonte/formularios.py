# -*- coding: utf-8 -*-
"""Especificação do Kit Pré-MTR: 3 categorias e 15 formulários.

Cada campo é uma tupla montada pelas funções abaixo. O build transforma a
especificação em HTML preenchível. "span" usa uma grade de 12 colunas.
"""

# ------------------------------------------------------------ componentes

def T(k, rotulo, span=6, ph=""):
    return {"t": "text", "k": k, "l": rotulo, "s": span, "ph": ph}


def D(k, rotulo, span=3):
    return {"t": "date", "k": k, "l": rotulo, "s": span}


def H(k, rotulo, span=2):
    return {"t": "time", "k": k, "l": rotulo, "s": span}


def N(k, rotulo, span=3, ph=""):
    return {"t": "num", "k": k, "l": rotulo, "s": span, "ph": ph}


def U(k, rotulo="Unidade de medida", span=3):
    return {"t": "list", "k": k, "l": rotulo, "s": span, "list": "dl-unidades", "ph": "kg, t, L, m³, unidades..."}


def A(k, rotulo, linhas=3, span=12, ph=""):
    return {"t": "area", "k": k, "l": rotulo, "s": span, "rows": linhas, "ph": ph}


def R(k, rotulo, opcoes, span=12):
    """Escolha única (botões de opção)."""
    return {"t": "radio", "k": k, "l": rotulo, "s": span, "o": opcoes}


def C(k, rotulo, opcoes, span=12):
    """Múltipla escolha (caixas de seleção)."""
    return {"t": "checks", "k": k, "l": rotulo, "s": span, "o": opcoes}


def X(k, rotulo, span=12):
    """Caixa de seleção única (sim/não)."""
    return {"t": "check", "k": k, "l": rotulo, "s": span}


def NOTA(texto):
    return {"t": "nota", "texto": texto, "s": 12}


def SUB(titulo, campos, k=None, span=6, na=False):
    """Subgrupo com título (ex.: dados de cada participante)."""
    return {"t": "sub", "titulo": titulo, "campos": campos, "s": span, "k": k, "na": na}


def TAB(k, rotulo, colunas, minimo=3, impressao=6, pre=None, nota=None, numerar=True):
    """Tabela com linhas que podem ser adicionadas e removidas.

    colunas: (chave, rótulo, tipo, largura relativa)
    tipos: text, num, unit, date, check, tri (Conferido/Pendente/N.A.),
           vnc (Verificado/Necessita conferência/N.A.), list:<id>
    pre: linhas pré-preenchidas na primeira coluna (sugestões editáveis)
    """
    return {"t": "tabela", "k": k, "l": rotulo, "cols": colunas, "min": minimo, "imp": impressao,
            "pre": pre or [], "nota": nota, "num": numerar, "s": 12}


def CHECK(k, rotulo, itens, extras=2):
    """Lista de conferência com itens fixos e espaço para itens adicionais."""
    return {"t": "checklist", "k": k, "l": rotulo, "itens": itens, "extras": extras, "s": 12}


def CALC(k):
    return {"t": "calc", "k": k, "s": 12}


TRI = ["Conferido", "Pendente", "Não aplicável"]
VNC = ["Verificado", "Necessita conferência", "Não aplicável"]
COMUNICACAO = ["E-mail", "Mensagem", "Telefone", "Reunião", "Outra"]

# ------------------------------------------------------------- categorias

CATEGORIAS = [
    {
        "num": "01",
        "nome": "Preparação da coleta",
        "cor": "#17806C",
        "tint": "#E8F4EF",
        "icone": "box",
        "resumo": "Cinco formulários para reunir informações e organizar a coleta.",
        "desc": "Use antes da movimentação: registre o pedido de coleta, organize os dados do resíduo, levante quantidades, confira o acondicionamento e programe a retirada.",
    },
    {
        "num": "02",
        "nome": "Dados e movimentação",
        "cor": "#1E6E8C",
        "tint": "#E6F1F6",
        "icone": "idcard",
        "resumo": "Cinco formulários para organizar dados de parceiros, informações preparatórias e conferências.",
        "desc": "Use para cadastrar transportadores e destinadores, reunir os dados que serão lançados no MTR, conferir documentos antes da saída e registrar a retirada.",
    },
    {
        "num": "03",
        "nome": "Acompanhamento operacional",
        "cor": "#9A6B22",
        "tint": "#F8F0E2",
        "icone": "clipboard",
        "resumo": "Cinco formulários para registrar recebimentos, divergências, ocorrências e encaminhamentos.",
        "desc": "Use depois da saída da carga: registre o recebimento informado, divergências de quantidade, ocorrências, pendências e o encerramento do acompanhamento.",
    },
]

# ------------------------------------------------------------- formulários

FORMULARIOS = [
    # ===================================================== CATEGORIA 01
    {
        "cat": "01",
        "titulo": "Solicitação de coleta de resíduos",
        "icone": "truck",
        "curta": "Registre o pedido de retirada de resíduos e acompanhe a confirmação.",
        "finalidade": "Registrar internamente um pedido de coleta e acompanhar sua confirmação.",
        "orientacao": "Use quando um setor ou unidade pedir a retirada de resíduos. Preencha com os dados disponíveis e atualize a situação até a coleta ser confirmada.",
        "blocos": [
            ("Identificação da solicitação", [
                T("empresa", "Empresa solicitante", 6),
                T("unidade", "Unidade ou local de origem", 6),
                T("responsavel", "Responsável pela solicitação", 5),
                T("contato", "Contato profissional (telefone ou e-mail)", 4),
                D("data", "Data da solicitação", 3),
            ]),
            ("Resíduos a coletar", [
                TAB("residuos", "Resíduos", [
                    ("descricao", "Tipo ou descrição do resíduo", "text", 40),
                    ("quantidade", "Quantidade estimada", "num", 15),
                    ("unidade", "Unidade de medida", "unit", 15),
                    ("acondicionamento", "Forma de acondicionamento", "text", 30),
                ], minimo=3, impressao=5),
            ]),
            ("Retirada", [
                T("local", "Local previsto para retirada", 9),
                D("data_pref", "Data preferencial", 3),
                A("obs_oper", "Observações operacionais", 3, ph="Acesso, horário de funcionamento, equipamentos necessários, restrições do local..."),
            ]),
            ("Acompanhamento da solicitação", [
                R("situacao", "Situação da solicitação", ["Registrada", "Em análise", "Confirmada", "Reprogramada", "Cancelada"]),
                T("confirmado_com", "Confirmado com (nome e empresa)", 6),
                D("data_conf", "Data da confirmação", 3),
                D("data_coleta", "Data acertada para a coleta", 3),
                A("info_conf", "Informações de confirmação", 2, ph="Horário combinado, veículo informado, orientações recebidas..."),
            ]),
            ("Registro", [
                T("preenchido_por", "Preenchido por", 9),
                D("data_reg", "Data do registro", 3),
            ]),
        ],
    },
    {
        "cat": "01",
        "titulo": "Ficha de identificação do resíduo",
        "icone": "drum",
        "curta": "Organize em um só lugar as informações disponíveis sobre um resíduo.",
        "finalidade": "Organizar as informações disponíveis sobre um resíduo gerado.",
        "orientacao": "Use uma ficha para cada resíduo, registrando de onde veio cada informação. A ficha organiza dados e não substitui a avaliação técnica nem a documentação exigível.",
        "blocos": [
            ("Origem", [
                T("unidade", "Unidade geradora", 6),
                T("setor", "Setor ou atividade de origem", 6),
                T("responsavel", "Responsável pelas informações", 6),
                T("contato", "Contato profissional", 3),
                D("data", "Data do levantamento", 3),
            ]),
            ("Identificação do resíduo", [
                T("identificacao", "Identificação do resíduo (nome usado internamente)", 8),
                T("codigo", "Código de identificação, quando aplicável", 4),
                A("descricao", "Descrição", 2, ph="Composição conhecida, processo que gera o resíduo, características observadas..."),
                R("estado", "Estado físico, quando pertinente", ["Sólido", "Pastoso", "Líquido", "Outro", "Não informado"]),
            ]),
            ("Classificação técnica", [
                T("classificacao", "Classificação técnica informada ou verificada", 7),
                T("resp_tecnico", "Responsável técnico consultado, se houver", 5),
                R("origem_classif", "Origem da informação", ["Informada", "Verificada em documento", "A confirmar"], 12),
                T("referencia", "Referência utilizada para conferência", 9, ph="Laudo, ficha técnica, norma ou documento consultado"),
                D("data_ref", "Data da referência", 3),
            ]),
            ("Quantidade e acondicionamento", [
                N("quantidade", "Quantidade estimada", 3),
                U("unidade_med", "Unidade de medida", 3),
                T("periodo", "Período de referência", 6, ph="Por dia, por mês, por lote..."),
                T("acondicionamento", "Forma de acondicionamento", 12),
            ]),
            ("Observações e registro", [
                A("obs", "Observações", 2, ph="Informações a confirmar, documentos solicitados, cuidados indicados pelo setor..."),
                T("preenchido_por", "Preenchido por", 6),
                D("data_reg", "Data do registro", 3),
                D("revisao", "Próxima revisão", 3),
            ]),
        ],
    },
    {
        "cat": "01",
        "titulo": "Levantamento de quantidades de resíduos",
        "icone": "scale",
        "curta": "Anote quantidades estimadas ou verificadas, resíduo por resíduo.",
        "finalidade": "Registrar quantidades estimadas ou verificadas de cada resíduo.",
        "orientacao": "Use em levantamentos periódicos ou antes de programar uma coleta. Indique sempre a unidade de medida e de onde veio cada valor.",
        "blocos": [
            ("Identificação do levantamento", [
                T("empresa", "Empresa", 6),
                T("unidade", "Unidade", 6),
                T("setor", "Setor", 6),
                T("responsavel", "Responsável pelo levantamento", 3),
                D("data", "Data do levantamento", 3),
            ]),
            ("Quantidades levantadas", [
                TAB("itens", "Quantidades", [
                    ("residuo", "Identificação ou descrição do resíduo", "text", 34),
                    ("quantidade", "Quantidade", "num", 12),
                    ("unidade", "Unidade de medida", "unit", 13),
                    ("origem", "Origem da informação", "list:dl-origem", 19),
                    ("obs", "Observações", "text", 22),
                ], minimo=5, impressao=14,
                    nota="Os valores não são somados automaticamente, porque podem estar em unidades diferentes. Peso, volume e número de volumes não são equivalentes entre si."),
            ]),
            ("Observações e conferência", [
                A("obs", "Observações gerais", 3),
                T("conferido_por", "Conferido por", 6),
                D("data_conf", "Data da conferência", 3),
            ]),
        ],
    },
    {
        "cat": "01",
        "titulo": "Conferência de acondicionamento",
        "icone": "check",
        "curta": "Faça uma conferência visual dos recipientes e registre o que precisa ser verificado.",
        "finalidade": "Apoiar a conferência visual do acondicionamento antes da coleta.",
        "orientacao": "Registre o que foi observado em cada recipiente e encaminhe os pontos que precisam de verificação. Esta ficha não substitui inspeções, normas técnicas ou procedimentos internos.",
        "blocos": [
            ("Identificação da conferência", [
                T("local", "Local", 6),
                T("area", "Área ou setor", 3),
                D("data", "Data", 3),
                T("responsavel", "Responsável pela conferência", 9),
                H("hora", "Horário", 3),
            ]),
            ("Itens observados", [
                TAB("itens", "Recipientes observados", [
                    ("residuo", "Resíduo identificado", "text", 22),
                    ("recipiente", "Recipiente ou acondicionamento observado", "text", 22),
                    ("identificacao", "Identificação disponível", "vnc", 14),
                    ("condicao", "Condição visual observada", "vnc", 14),
                    ("ponto", "Ponto a verificar", "text", 28),
                ], minimo=3, impressao=6,
                    nota="V = Verificado · NC = Necessita conferência · NA = Não aplicável"),
            ]),
            ("Pontos para verificação", [
                A("pontos", "Pontos que necessitam de verificação", 3),
                A("obs", "Observações", 2),
            ]),
            ("Encaminhamento", [
                T("encaminhado_a", "Encaminhado a (responsável competente)", 6),
                T("area_enc", "Área", 3),
                D("data_enc", "Data do encaminhamento", 3),
                R("forma", "Forma de comunicação", COMUNICACAO),
                A("retorno", "Retorno recebido", 2),
            ]),
        ],
    },
    {
        "cat": "01",
        "titulo": "Agendamento de coleta",
        "icone": "calendar",
        "curta": "Organize data, transportador, carga prevista e orientações de acesso.",
        "finalidade": "Organizar as informações de uma coleta programada.",
        "orientacao": "Use depois que a coleta for combinada com o transportador. Deixe registradas as orientações de acesso e o responsável que vai acompanhar a retirada.",
        "blocos": [
            ("Dados da coleta", [
                T("empresa", "Empresa geradora", 6),
                T("local", "Local de coleta", 6),
                D("data", "Data programada", 3),
                H("hora_ini", "Janela prevista: das", 2),
                H("hora_fim", "às", 2),
                T("referencia", "Referência da movimentação", 5),
                T("transportadora", "Empresa transportadora", 6),
                T("contato", "Contato de referência (nome e telefone)", 6),
            ]),
            ("Carga prevista", [
                TAB("carga", "Carga prevista", [
                    ("residuo", "Resíduo ou carga prevista", "text", 42),
                    ("quantidade", "Quantidade estimada", "num", 16),
                    ("unidade", "Unidade de medida", "unit", 16),
                    ("acondicionamento", "Acondicionamento", "text", 26),
                ], minimo=3, impressao=5),
            ]),
            ("Acesso e orientações", [
                A("acesso", "Informações de acesso ao local", 3, ph="Portaria, documentos para entrada, horários permitidos, restrições de circulação..."),
                A("orientacoes", "Orientações operacionais internas", 3, ph="Quem libera a carga, onde o veículo deve parar, conferências previstas..."),
            ]),
            ("Acompanhamento", [
                T("resp_acomp", "Responsável pelo acompanhamento", 6),
                T("contato_resp", "Contato do responsável", 6),
                R("situacao", "Situação do agendamento", ["A confirmar", "Confirmado", "Reprogramado", "Realizado", "Cancelado"]),
                D("nova_data", "Nova data, se reprogramado", 3),
                A("obs", "Observações", 2, span=9),
            ]),
        ],
    },
    # ===================================================== CATEGORIA 02
    {
        "cat": "02",
        "titulo": "Ficha cadastral do transportador",
        "icone": "idcard",
        "curta": "Reúna os dados do transportador e acompanhe o que precisa ser conferido.",
        "finalidade": "Organizar os dados cadastrais de um transportador e as conferências realizadas.",
        "orientacao": "Atualize a ficha a cada conferência e registre a fonte das informações. A ficha organiza dados e não comprova habilitação, licenciamento ou regularidade.",
        "blocos": [
            ("Dados da empresa", [
                T("razao", "Razão social", 8),
                T("cnpj", "CNPJ", 4, ph="00.000.000/0000-00"),
                T("endereco", "Endereço ou unidade de referência", 12),
                T("contato", "Contato profissional", 6),
                T("tel_email", "Telefone ou e-mail corporativo", 6),
            ]),
            ("Sistema de registro", [
                T("sistema", "Sistema aplicável, quando pertinente", 6, ph="Sistema de MTR utilizado na movimentação"),
                T("cadastro", "Identificação ou cadastro no sistema", 6),
                A("obs_sistema", "Informações cadastrais no sistema", 2),
            ]),
            ("Documentos ou informações a conferir", [
                TAB("docs", "Documentos", [
                    ("documento", "Documento ou informação", "text", 47),
                    ("referencia", "Número ou referência", "text", 18),
                    ("validade", "Validade informada", "date", 14),
                    ("situacao", "Situação", "tri", 21),
                ], minimo=5, impressao=6, pre=[
                    "Licença ou autorização ambiental aplicável",
                    "Cadastro no sistema de MTR, se aplicável",
                    "Documentos do veículo (procedimento interno)",
                    "Contato operacional atualizado",
                ], nota="C = Conferido · P = Pendente · NA = Não aplicável"),
            ]),
            ("Conferência", [
                T("resp_conf", "Responsável pela conferência", 6),
                D("data_conf", "Data da última conferência", 3),
                D("prox_conf", "Próxima conferência prevista", 3),
                A("obs", "Observações", 3),
            ]),
        ],
    },
    {
        "cat": "02",
        "titulo": "Ficha cadastral do destinador",
        "icone": "factory",
        "curta": "Registre os dados da unidade destinadora, os resíduos previstos e as referências a conferir.",
        "finalidade": "Organizar os dados de uma unidade destinadora e as referências conferidas.",
        "orientacao": "Use uma ficha para cada unidade destinadora. Registre os resíduos previstos e o serviço pretendido para cada um.",
        "blocos": [
            ("Dados da empresa", [
                T("razao", "Razão social", 8),
                T("cnpj", "CNPJ", 4, ph="00.000.000/0000-00"),
                T("unidade", "Unidade destinadora", 6),
                T("localizacao", "Localização (endereço, município e UF)", 6),
                T("contato", "Contato profissional", 6),
                T("tel_email", "Telefone ou e-mail corporativo", 6),
            ]),
            ("Resíduos e serviço", [
                TAB("residuos", "Resíduos previstos", [
                    ("residuo", "Resíduo previsto", "text", 36),
                    ("servico", "Serviço ou destinação pretendida", "list:dl-destinacao", 32),
                    ("obs", "Observações", "text", 32),
                ], minimo=3, impressao=4),
            ]),
            ("Referências documentais a conferir", [
                TAB("docs", "Referências", [
                    ("documento", "Referência documental", "text", 47),
                    ("referencia", "Número ou referência", "text", 18),
                    ("validade", "Validade informada", "date", 14),
                    ("situacao", "Situação", "tri", 21),
                ], minimo=5, impressao=5, pre=[
                    "Licença ambiental da unidade, conforme atividade",
                    "Cadastro no sistema de MTR, se aplicável",
                    "Contrato ou proposta de serviço",
                    "Emissão do comprovante de destinação",
                ], nota="C = Conferido · P = Pendente · NA = Não aplicável"),
            ]),
            ("Conferência", [
                T("sistema", "Sistema de registro aplicável, quando identificado", 12),
                T("resp_conf", "Responsável pela conferência", 9),
                D("data_conf", "Data", 3),
                A("obs", "Observações", 3),
            ]),
        ],
    },
    {
        "cat": "02",
        "titulo": "Ficha preparatória de informações para MTR",
        "icone": "doc",
        "curta": "Reúna e confira os dados antes de lançar o MTR no sistema.",
        "finalidade": "Reunir e conferir previamente os dados que podem ser necessários ao preenchimento do MTR.",
        "orientacao": "Preencha antes de acessar o sistema e confira cada participante. Os campos exigidos podem variar conforme o sistema utilizado.",
        "aviso": "Ficha interna preparatória. Não substitui o MTR emitido no sistema aplicável.",
        "blocos": [
            ("Identificação", [
                T("referencia", "Referência interna da movimentação", 5),
                T("sistema", "Sistema a ser utilizado, quando identificado", 7),
                T("responsavel", "Responsável pela conferência", 9),
                D("data", "Data", 3),
            ]),
            ("Participantes da movimentação", [
                SUB("Gerador", [
                    T("ger_razao", "Razão social", 12),
                    T("ger_cnpj", "CNPJ", 6),
                    R("ger_sit", "Dados", ["Conferidos", "A conferir"], 6),
                    T("ger_unidade", "Unidade de origem", 12),
                ]),
                SUB("Transportador", [
                    T("tra_razao", "Razão social", 12),
                    T("tra_cnpj", "CNPJ", 6),
                    R("tra_sit", "Dados", ["Conferidos", "A conferir"], 6),
                    T("tra_veiculo", "Veículo ou placa, quando informado", 12),
                ]),
                SUB("Destinador", [
                    T("des_razao", "Razão social", 12),
                    T("des_cnpj", "CNPJ", 6),
                    R("des_sit", "Dados", ["Conferidos", "A conferir"], 6),
                    T("des_unidade", "Unidade destinadora", 12),
                ]),
                SUB("Armazenador temporário, se aplicável", [
                    T("arm_razao", "Razão social", 12),
                    T("arm_cnpj", "CNPJ", 6),
                    R("arm_sit", "Dados", ["Conferidos", "A conferir"], 6),
                    X("arm_na", "Não se aplica a esta movimentação", 12),
                ]),
            ]),
            ("Resíduos da movimentação", [
                TAB("residuos", "Resíduos", [
                    ("residuo", "Resíduo", "text", 30),
                    ("codigo", "Código ou identificação aplicável", "text", 20),
                    ("quantidade", "Quantidade", "num", 12),
                    ("unidade", "Unidade de medida", "unit", 13),
                    ("acondicionamento", "Acondicionamento", "text", 17),
                    ("conferido", "Conferido", "check", 8),
                ], minimo=3, impressao=4),
            ]),
            ("Observações e pendências", {"quebra": True}, [
                A("obs", "Observações sobre a movimentação", 5),
                TAB("pendencias", "Informações pendentes", [
                    ("pendencia", "Informação pendente", "text", 52),
                    ("quem", "Quem vai informar", "text", 24),
                    ("prazo", "Prazo", "date", 14),
                    ("ok", "Resolvida", "check", 10),
                ], minimo=2, impressao=7),
                R("pronta", "Situação da ficha", ["Pronta para lançamento no sistema", "Com pendências"]),
            ]),
        ],
    },
    {
        "cat": "02",
        "titulo": "Checklist de conferência documental pré-saída",
        "icone": "clipboard",
        "curta": "Confira os itens documentais e operacionais antes da saída da carga.",
        "finalidade": "Apoiar a conferência documental interna antes da saída da carga.",
        "orientacao": "Marque cada item antes da saída e registre o que ficou pendente. O checklist apoia a conferência interna e não comprova o cumprimento de todas as obrigações aplicáveis.",
        "blocos": [
            ("Identificação", [
                T("referencia", "Referência da movimentação", 4),
                T("local", "Local de saída", 5),
                D("data", "Data", 3),
            ]),
            ("Itens de conferência", [
                CHECK("itens", "Itens", [
                    "Identificação do resíduo conferida",
                    "Quantidade informada conferida",
                    "Dados do transportador verificados",
                    "Dados do destinador verificados",
                    "Documento de transporte aplicável verificado, conforme o sistema utilizado",
                    "Informações operacionais da coleta confirmadas",
                    "Pendências registradas",
                    "Referências adicionais aplicáveis verificadas, quando houver",
                ], extras=2),
            ]),
            ("Resultado da conferência", [
                R("resultado", "Resultado", ["Sem pendências registradas", "Com pendências registradas"]),
                A("pendencias", "Pendências e encaminhamentos", 3),
            ]),
            ("Registro", [
                T("responsavel", "Responsável pela conferência", 6),
                D("data_reg", "Data", 3),
                H("hora", "Horário", 3),
                A("obs", "Observações", 2),
            ]),
        ],
    },
    {
        "cat": "02",
        "titulo": "Registro de confirmação de retirada",
        "icone": "truck",
        "curta": "Registre como foi a retirada: horário, transportador, resíduos e divergências.",
        "finalidade": "Registrar internamente a retirada dos resíduos no local de origem.",
        "orientacao": "Preencha no momento da retirada ou logo depois, com as informações observadas.",
        "aviso": "Registro interno. Não substitui os documentos de transporte aplicáveis.",
        "blocos": [
            ("Dados da retirada", [
                T("empresa", "Empresa ou unidade geradora", 6),
                T("local", "Local da retirada", 6),
                D("data", "Data", 3),
                H("hora", "Horário", 2),
                T("transportador", "Transportador informado", 7),
                T("referencia", "Referência da movimentação", 6, ph="Nº do MTR ou referência interna"),
                T("veiculo", "Veículo ou placa, quando informado", 6),
            ]),
            ("Resíduos retirados", [
                TAB("residuos", "Resíduos retirados", [
                    ("residuo", "Resíduo", "text", 34),
                    ("qtd_inf", "Quantidade informada", "num", 14),
                    ("qtd_obs", "Quantidade observada", "num", 14),
                    ("unidade", "Unidade de medida", "unit", 13),
                    ("obs", "Observação", "text", 25),
                ], minimo=3, impressao=6),
            ]),
            ("Divergências", [
                R("houve", "Divergências", ["Nenhuma identificada", "Identificadas e descritas abaixo"]),
                A("divergencias", "Divergências registradas", 3),
            ]),
            ("Acompanhamento", [
                T("responsavel", "Responsável pelo acompanhamento", 9),
                D("data_reg", "Data do registro", 3),
                A("obs", "Observações", 2),
            ]),
        ],
    },
    # ===================================================== CATEGORIA 03
    {
        "cat": "03",
        "titulo": "Registro de informações do recebimento",
        "icone": "inbox",
        "curta": "Organize as informações recebidas sobre a chegada da carga ao destino.",
        "finalidade": "Organizar as informações recebidas sobre a chegada da carga ao destino.",
        "orientacao": "Registre a confirmação de recebimento e a fonte da informação. O recebimento pode acontecer antes da destinação final, que deve ser acompanhada à parte.",
        "blocos": [
            ("Movimentação", [
                T("mtr", "Referência do MTR, quando aplicável", 4),
                T("gerador", "Gerador", 8),
                T("transportador", "Transportador", 6),
                T("destinador", "Destinador", 6),
            ]),
            ("Resíduos e quantidades", [
                TAB("residuos", "Resíduos", [
                    ("residuo", "Resíduo", "text", 36),
                    ("enviada", "Quantidade enviada", "num", 16),
                    ("recebida", "Quantidade recebida informada", "num", 18),
                    ("unidade", "Unidade de medida", "unit", 14),
                    ("diverg", "Divergência", "check", 16),
                ], minimo=2, impressao=5),
            ]),
            ("Confirmação do recebimento", [
                D("data_rec", "Data informada do recebimento", 3),
                D("data_info", "Data em que a informação foi obtida", 3),
                T("fonte_det", "Quem informou", 6),
                R("fonte", "Fonte da confirmação", ["Sistema de MTR", "E-mail do destinador", "Comprovante ou ticket", "Contato telefônico", "Outra"]),
            ]),
            ("Divergências e registro", [
                A("divergencias", "Divergências identificadas", 4),
                A("obs", "Observações", 3),
                T("responsavel", "Responsável pelo registro", 9),
                D("data_reg", "Data do registro", 3),
            ]),
        ],
    },
    {
        "cat": "03",
        "titulo": "Registro de divergência de quantidade",
        "icone": "scale",
        "curta": "Documente uma diferença entre a quantidade informada e a verificada.",
        "finalidade": "Documentar internamente uma possível divergência de quantidade.",
        "orientacao": "Registre os dois valores com a unidade e a fonte de cada um. A diferença só é calculada quando as unidades forem iguais.",
        "blocos": [
            ("Identificação", [
                T("movimentacao", "Identificação da movimentação", 6),
                T("residuo", "Resíduo", 6),
                T("responsavel", "Responsável pelo registro", 9),
                D("data", "Data da identificação", 3),
            ]),
            ("Valores comparados", [
                SUB("Quantidade originalmente informada", [
                    N("q1", "Quantidade", 6),
                    U("u1", "Unidade de medida", 6),
                    T("f1", "Fonte do valor", 12, ph="MTR, nota fiscal, pesagem na saída..."),
                ]),
                SUB("Quantidade recebida ou verificada", [
                    N("q2", "Quantidade", 6),
                    U("u2", "Unidade de medida", 6),
                    T("f2", "Fonte do valor", 12, ph="Informação do destinador, ticket de balança..."),
                ]),
                CALC("diferenca"),
            ]),
            ("Descrição da divergência", [
                A("descricao", "Descrição da divergência", 4),
            ]),
            ("Comunicação e acompanhamento", [
                T("comunicado", "Responsável comunicado", 6),
                T("empresa", "Empresa ou área", 3),
                D("data_com", "Data da comunicação", 3),
                R("forma", "Forma de comunicação", COMUNICACAO),
                R("situacao", "Situação do acompanhamento", ["Aberta", "Aguardando retorno", "Em análise", "Esclarecida", "Encerrada"]),
                A("obs", "Observações finais", 3),
            ]),
        ],
    },
    {
        "cat": "03",
        "titulo": "Registro de ocorrência na coleta ou movimentação",
        "icone": "alert",
        "curta": "Registre fatos operacionais que precisam de acompanhamento.",
        "finalidade": "Registrar situações operacionais que precisam de acompanhamento.",
        "orientacao": "Descreva os fatos de forma objetiva, sem suposições. Em situações de emergência, as equipes devem seguir os procedimentos de segurança aplicáveis.",
        "blocos": [
            ("Identificação", [
                D("data", "Data", 3),
                H("hora", "Horário", 2),
                T("local", "Local", 7),
                T("envolvida", "Unidade ou empresa envolvida", 6),
                T("referencia", "Referência da movimentação", 6),
            ]),
            ("Ocorrência", [
                C("tipo", "Tipo de ocorrência", [
                    "Atraso ou não comparecimento na coleta",
                    "Reprogramação",
                    "Divergência de informação ou documento",
                    "Carga recusada ou devolvida",
                    "Dificuldade de acesso ao local",
                    "Condição de acondicionamento observada",
                    "Outra",
                ]),
                T("tipo_outra", "Se outra, especifique", 12),
                A("fatos", "Descrição objetiva dos fatos", 4),
            ]),
            ("Comunicação e encaminhamento", [
                TAB("comunicados", "Pessoas ou áreas comunicadas", [
                    ("quem", "Pessoa ou área profissional comunicada", "text", 50),
                    ("forma", "Forma", "text", 25),
                    ("data", "Data", "date", 25),
                ], minimo=2, impressao=2),
                A("encaminhamento", "Encaminhamento informado", 2),
            ]),
            ("Acompanhamento", [
                R("situacao", "Situação do acompanhamento", ["Aberta", "Em acompanhamento", "Encerrada"], 6),
                T("responsavel", "Responsável pelo registro", 4),
                D("data_reg", "Data do registro", 2),
                A("obs", "Observações adicionais", 2),
            ]),
        ],
    },
    {
        "cat": "03",
        "titulo": "Registro de pendência documental",
        "icone": "folder",
        "curta": "Detalhe uma pendência específica e acompanhe cada contato até o encerramento.",
        "finalidade": "Detalhar e acompanhar uma pendência documental específica.",
        "orientacao": "Use uma ficha para cada pendência que exige acompanhamento próximo. O controle geral continua na planilha ou no sistema que você já utiliza.",
        "blocos": [
            ("Pendência", [
                T("referencia", "Referência da movimentação", 5),
                T("documento", "Documento relacionado", 7, ph="MTR, CDF, nota fiscal, ticket, cadastro..."),
                A("pendencia", "Pendência identificada", 3),
                D("data_id", "Data de identificação", 3),
                T("responsavel", "Responsável pelo acompanhamento", 9),
            ]),
            ("Providência solicitada", [
                T("contatado", "Empresa ou setor contatado", 6),
                T("contato", "Contato", 6),
                A("providencia", "Providência solicitada", 3, span=9),
                D("data_sol", "Data da solicitação", 3),
            ]),
            ("Histórico de acompanhamento", [
                TAB("historico", "Histórico", [
                    ("data", "Data", "date", 16),
                    ("info", "Informações recebidas ou contato realizado", "text", 64),
                    ("prox", "Próxima verificação", "date", 20),
                ], minimo=3, impressao=7),
            ]),
            ("Situação e encerramento", [
                R("situacao", "Situação atual", ["Aberta", "Aguardando retorno", "Em análise", "Resolvida", "Encerrada"]),
                D("prox_verif", "Próxima verificação", 3),
                T("evidencia", "Evidência ou referência do encerramento", 6),
                D("data_enc", "Data do encerramento", 3),
            ]),
        ],
    },
    {
        "cat": "03",
        "titulo": "Registro de encerramento do acompanhamento",
        "subtitulo": "Encerramento do acompanhamento interno",
        "icone": "archive",
        "curta": "Registre o encerramento interno de um acompanhamento específico.",
        "finalidade": "Registrar o encerramento administrativo de um acompanhamento interno.",
        "orientacao": "Preencha quando o acompanhamento de uma movimentação for concluído internamente. Este registro não é certificado de destinação nem declaração de conformidade.",
        "blocos": [
            ("Identificação", [
                T("movimentacao", "Identificação da movimentação", 4),
                T("unidade", "Unidade geradora", 4),
                T("residuo", "Resíduo", 4),
            ]),
            ("Referências documentais disponíveis", [
                TAB("refs", "Referências", [
                    ("documento", "Documento", "text", 36),
                    ("numero", "Número ou referência", "text", 30),
                    ("data", "Data", "date", 18),
                    ("consultado", "Consultado", "check", 16),
                ], minimo=4, impressao=4, pre=[
                    "MTR, quando aplicável",
                    "Comprovante de recebimento",
                    "CDF ou comprovante de destinação",
                ]),
            ]),
            ("Histórico do acompanhamento", [
                A("situacao_ini", "Situação inicialmente acompanhada", 2),
                A("providencias", "Providências realizadas", 2),
                A("evidencias", "Evidências documentais consultadas", 2),
                R("remanescentes", "Pendências remanescentes", ["Nenhuma identificada", "Há pendências, descritas abaixo"]),
                A("rem_desc", "Descrição das pendências remanescentes", 2),
            ]),
            ("Encerramento do acompanhamento interno", [
                A("obs", "Observações de encerramento", 2),
                T("responsavel", "Responsável pelo registro", 9),
                D("data", "Data", 3),
            ]),
        ],
    },
]

DATALISTS = {
    "dl-unidades": ["kg", "t", "L", "m³", "unidade(s)", "tambor(es)", "bombona(s)", "contêiner(es)", "big bag(s)", "caçamba(s)"],
    "dl-origem": ["Estimativa", "Pesagem", "Contagem de volumes", "Informação do setor", "Documento ou registro"],
    "dl-destinacao": ["Reciclagem", "Recuperação ou reaproveitamento", "Tratamento", "Coprocessamento", "Disposição final", "Armazenamento temporário", "A definir"],
}
