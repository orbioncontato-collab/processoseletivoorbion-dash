# -*- coding: utf-8 -*-
"""Especificação do Kit de 10 Relatórios Prontos de Gestão de Resíduos.

Cada relatório é uma lista de seções. As funções abaixo montam as seções;
o build transforma tudo em HTML editável. Textos-base usam termos entre
colchetes para indicar o que o responsável deve completar.
"""

# ------------------------------------------------------------ opções

SIT_MTR = ["Registro informado", "Recebimento informado", "Em acompanhamento", "Pendente de conferência", "Com pendência", "Não informado"]
SIT_CDF = ["Disponível", "Solicitado", "Em verificação", "Pendente", "Não localizado", "Não informado"]
SIT_PEND = ["Aberta", "Em acompanhamento", "Aguardando retorno", "Resolução informada", "Verificação adicional", "Encerrada"]
SIT_DIV = ["Identificada", "Em verificação", "Aguardando retorno", "Esclarecida", "Encerrada"]
SIT_DEST = ["Sem pendências registradas", "Com pendências registradas", "Em verificação", "Não informado"]
SIT_ACAO = ["Prevista", "Em andamento", "Concluída", "Aguardando retorno", "Cancelada"]
TIPO_DIV = ["Quantidade", "Resíduo ou classificação", "Dados cadastrais", "Data", "Documento", "Outro"]
PRIORIDADE = ["Alta", "Média", "Baixa"]

# Situações que pedem atenção (destaque discreto nas tabelas e indicadores)
ATENCAO = {
    "mtr": ["Pendente de conferência", "Com pendência", "Não informado"],
    "cdf": ["Solicitado", "Em verificação", "Pendente", "Não localizado", "Não informado"],
    "pend_acomp": ["Aberta", "Em acompanhamento", "Aguardando retorno"],
    "pend_res": ["Resolução informada", "Encerrada"],
    "div_acomp": ["Identificada", "Em verificação", "Aguardando retorno"],
    "div_res": ["Esclarecida", "Encerrada"],
    "dest": ["Com pendências registradas", "Em verificação", "Não informado"],
}

# Tom visual de cada situação: ok (verde), alerta (âmbar), neutro (cinza), info (azul)
TOM = {
    "Registro informado": "info", "Recebimento informado": "ok", "Em acompanhamento": "info", "Pendente de conferência": "alerta",
    "Com pendência": "alerta", "Não informado": "neutro", "Disponível": "ok", "Solicitado": "info", "Em verificação": "info",
    "Pendente": "alerta", "Não localizado": "alerta", "Aberta": "alerta", "Aguardando retorno": "info",
    "Resolução informada": "ok", "Verificação adicional": "alerta", "Encerrada": "neutro", "Identificada": "alerta",
    "Esclarecida": "ok", "Sem pendências registradas": "ok", "Com pendências registradas": "alerta", "Prevista": "neutro",
    "Em andamento": "info", "Concluída": "ok", "Cancelada": "neutro", "Alta": "alerta", "Média": "info", "Baixa": "neutro",
}

DATALISTS = {
    "dl-unidades": ["kg", "t", "L", "m³", "unidade(s)", "tambor(es)", "bombona(s)", "contêiner(es)", "big bag(s)", "caçamba(s)"],
    "dl-modalidade": ["Reciclagem", "Recuperação ou reaproveitamento", "Tratamento", "Coprocessamento", "Incineração", "Disposição final", "Armazenamento temporário", "Outra"],
    "dl-doc": ["MTR", "CDF", "Nota fiscal", "Ticket de pesagem", "Licença ou autorização", "Cadastro", "Outro"],
}

# ------------------------------------------------------------ construtores

def C(k, rotulo, tipo="text", peso=10, opcoes=None, lista=None):
    """Coluna de tabela. tipo: text, num, unit, date, sel, list, area, var"""
    return {"k": k, "l": rotulo, "t": tipo, "w": peso, "o": opcoes, "list": lista}


def IDENT(objetivo=None, cliente=False):
    return {"t": "ident", "titulo": "Identificação", "objetivo": objetivo, "cliente": cliente}


def TEXTO(k, titulo, texto, linhas=5, dica=None):
    return {"t": "texto", "k": k, "titulo": titulo, "texto": texto, "rows": linhas, "dica": dica}


def KPIS(titulo, cards, nota=None, k="kpis"):
    return {"t": "kpis", "k": k, "titulo": titulo, "cards": cards, "nota": nota}


def K(rotulo, tipo, icone="chart", **a):
    """Indicador. tipos: contar, unidades, soma, onde, distintos, manual, celula"""
    d = {"l": rotulo, "tipo": tipo, "icone": icone}
    d.update(a)
    return d


def TAB(k, titulo, cols, minimo=3, impressao=6, pre=None, extra=None, nota=None, atencao=None, texto=None, sub=None):
    """Tabela editável. extra: campos de uma segunda linha em cada registro.
    atencao: (coluna, chave em ATENCAO) para destacar registros."""
    return {"t": "tabela", "k": k, "titulo": titulo, "cols": cols, "min": minimo, "imp": impressao,
            "pre": pre or [], "extra": extra or [], "nota": nota, "atencao": atencao, "texto": texto, "sub": sub}


def GRAF(titulo, tipo, tabela, **a):
    """Gráfico SVG gerado a partir de uma tabela do próprio relatório.
    tipos: barras (rótulo, q, u), mensal (data), contagem (coluna), comparacao, pares"""
    d = {"t": "grafico", "titulo": titulo, "tipo": tipo, "tabela": tabela}
    d.update(a)
    return d


def RESUMO(titulo, tabela, grupo, q, u, rotulo_grupo, nota=None, situacao=None):
    """Tabela calculada: agrupa registros e soma quantidades por unidade."""
    return {"t": "resumo", "titulo": titulo, "tabela": tabela, "grupo": grupo, "q": q, "u": u,
            "rg": rotulo_grupo, "nota": nota, "situacao": situacao}


def LISTA_ATENCAO(titulo, tabela, colunas, chave, coluna_sit, nota=None):
    """Lista calculada dos registros de uma tabela que estão em situação de atenção."""
    return {"t": "lista", "titulo": titulo, "tabela": tabela, "colunas": colunas, "chave": chave, "sit": coluna_sit, "nota": nota}


def CARDS(titulo, tabela, grupo, q, u, sit, resid):
    return {"t": "cards", "titulo": titulo, "tabela": tabela, "grupo": grupo, "q": q, "u": u, "sit": sit, "resid": resid}


def DESTAQUES(titulo, blocos, texto=None):
    return {"t": "destaques", "titulo": titulo, "blocos": blocos, "texto": texto}


def CHECKS(k, titulo, opcoes, intro):
    return {"t": "checks", "k": k, "titulo": titulo, "o": opcoes, "intro": intro}


def MANCHETES(k, titulo, n=3):
    return {"t": "manchetes", "k": k, "titulo": titulo, "n": n}


def RESP(consultoria=False):
    return {"t": "resp", "titulo": "Responsável pela elaboração", "consultoria": consultoria}


def REFS(linhas=3):
    return {"t": "tabela", "k": "refs", "titulo": "Referências documentais", "cols": [
        C("doc", "Documento ou registro consultado", "list", 34, lista="dl-doc"),
        C("ref", "Número ou referência", "text", 24),
        C("data", "Data", "date", 14),
        C("obs", "Observação", "text", 28),
    ], "min": linhas, "imp": linhas, "pre": [], "extra": [], "nota": None, "atencao": None,
        "texto": "Relacione os registros e documentos consultados para elaborar este relatório.", "sub": None}


def CAPA(tipo):
    return {"t": "capa", "tipo": tipo}


Q = C("quantidade", "Quantidade", "num", 10)
U = C("unidade", "Unidade", "unit", 9)

FINAL_PADRAO = ("Este relatório tem caráter gerencial e foi elaborado a partir das informações disponíveis na data de emissão. "
                "Ele não substitui os documentos oficiais de controle de resíduos nem constitui declaração de conformidade ambiental.")

# ------------------------------------------------------------ grupos

GRUPOS = [
    {"k": "rotina", "nome": "Rotina e movimentações", "desc": "Visão do mês, das movimentações, das coletas e das quantidades.", "rels": ["01", "02", "05", "08"]},
    {"k": "docs", "nome": "Documentação e acompanhamento", "desc": "Certificados, pendências, divergências e destinadores.", "rels": ["03", "04", "06", "07"]},
    {"k": "apres", "nome": "Apresentação e gestão", "desc": "Modelos para clientes e para a tomada de decisão.", "rels": ["09", "10"]},
]

# ------------------------------------------------------------ relatórios

RELATORIOS = [
    # ============================================================= 01
    {
        "num": "01",
        "titulo": "Relatório mensal de gestão de resíduos",
        "curto": "Mensal de gestão",
        "arquivo": "01_Relatorio_Mensal_Gestao_Residuos",
        "icone": "calendar",
        "desc": "Visão geral do mês: quantidades, movimentações, coletas, documentos e pendências.",
        "secoes": [
            IDENT(objetivo="Este relatório apresenta uma visão geral das atividades de gestão de resíduos acompanhadas no mês de referência, com base nos registros e documentos disponibilizados para análise. As informações reunidas aqui apoiam o acompanhamento gerencial e devem ser conferidas com a documentação de origem."),
            TEXTO("resumo", "Resumo do período",
                  "No mês de referência, foram acompanhadas as atividades de gestão de resíduos da unidade [UNIDADE], incluindo [DESCREVA AS PRINCIPAIS ATIVIDADES, POR EXEMPLO: COLETAS, MOVIMENTAÇÕES E ACOMPANHAMENTO DE DOCUMENTOS].\n\n"
                  "As informações apresentadas a seguir foram organizadas a partir dos registros internos e dos documentos disponíveis até a data de emissão. Os dados devem ser lidos junto com as observações de cada seção, principalmente nos pontos que ainda dependem de confirmação."),
            KPIS("Indicadores principais", [
                K("Quantidade total registrada", "unidades", "scale", tabela="tipos", q="quantidade", u="unidade"),
                K("Movimentações", "contar", "route", tabela="movs", campo="referencia"),
                K("Coletas", "manual", "truck", k="coletas", ajuda="Informe o número de coletas registradas no mês."),
                K("Registros documentais acompanhados", "soma", "doc", tabela="docs", col="quantidade"),
                K("Pendências identificadas", "contar", "alert", tabela="pend", campo="pendencia"),
            ], nota="Os indicadores são calculados a partir das tabelas deste relatório. Quantidades em unidades diferentes aparecem separadas, sem conversão."),
            TAB("tipos", "Resumo por tipo de resíduo", [
                C("residuo", "Descrição do resíduo", "text", 40), Q, U, C("obs", "Observações", "text", 34),
            ], minimo=4, impressao=6),
            GRAF("Quantidades por tipo de resíduo", "barras", "tipos", rotulo="residuo", q="quantidade", u="unidade"),
            TAB("movs", "Movimentações do período", [
                C("data", "Data", "date", 12), C("referencia", "Referência (MTR ou interna)", "text", 17), C("residuo", "Resíduo", "text", 20), Q, U,
                C("destinador", "Destinador", "text", 18), C("situacao", "Situação documental", "sel", 16, opcoes=SIT_MTR),
            ], minimo=4, impressao=8, atencao=("situacao", "mtr"), nota="Registros em situação que exige conferência aparecem destacados."),
            TAB("docs", "Documentação", [
                C("documento", "Documento", "text", 22), C("quantidade", "Quantidade acompanhada", "num", 14),
                C("situacao", "Situação resumida", "text", 32), C("obs", "Observações", "text", 32),
            ], minimo=3, impressao=4, pre=["MTR", "CDF", "Outros documentos"],
                texto="Os documentos relacionados às movimentações do período estão resumidos abaixo. A situação indicada corresponde às informações disponíveis na data de emissão e pode exigir conferência no sistema aplicável."),
            TAB("pend", "Pendências e observações", [
                C("pendencia", "Pendência ou ponto de atenção", "text", 40), C("relacionado", "Documento ou movimentação", "text", 22),
                C("responsavel", "Responsável", "text", 18), C("situacao", "Situação", "sel", 16, opcoes=SIT_PEND),
            ], minimo=3, impressao=4, atencao=("situacao", "pend_acomp")),
            TEXTO("obs_pend", "Observações sobre as pendências", "[REGISTRE AQUI OBSERVAÇÕES SOBRE AS PENDÊNCIAS QUE PRECISAM DE ATENÇÃO, INDICANDO O MOTIVO E O PRÓXIMO PASSO PREVISTO.]", 3),
            TEXTO("final", "Considerações finais",
                  "Com base nas informações registradas no período, [DESCREVA OS PRINCIPAIS RESULTADOS OBSERVADOS]. Os pontos indicados como pendentes ou em acompanhamento seguirão sendo verificados junto aos responsáveis, e as atualizações serão registradas no próximo relatório.\n\n" + FINAL_PADRAO, 5),
            RESP(),
            REFS(),
        ],
    },
    # ============================================================= 02
    {
        "num": "02",
        "titulo": "Relatório de movimentações e MTRs",
        "curto": "Movimentações e MTRs",
        "arquivo": "02_Relatorio_Movimentacoes_MTR",
        "icone": "route",
        "desc": "Resumo gerencial das movimentações do período, organizado por referência de MTR.",
        "secoes": [
            IDENT(),
            TEXTO("objetivo", "Objetivo",
                  "Este documento apresenta um resumo gerencial das movimentações de resíduos registradas no período de referência, organizado a partir das referências de MTR e das informações de transporte e destinação disponíveis. O relatório tem finalidade de acompanhamento e não substitui o MTR emitido no sistema aplicável.", 4),
            KPIS("Quadro geral", [
                K("Movimentações registradas", "contar", "route", tabela="movs", campo="mtr"),
                K("Quantidades registradas", "unidades", "scale", tabela="movs", q="quantidade", u="unidade"),
                K("Transportadores", "distintos", "truck", tabela="movs", col="transportador"),
                K("Destinadores", "distintos", "factory", tabela="movs", col="destinador"),
                K("Registros que exigem conferência", "onde", "alert", tabela="movs", col="situacao", chave="mtr", tom="alerta"),
            ], nota="Os indicadores são calculados a partir da tabela principal deste relatório."),
            TAB("movs", "Tabela principal das movimentações", [
                C("mtr", "Referência do MTR", "text", 14), C("data", "Data", "date", 12), C("residuo", "Resíduo", "text", 17), Q, U,
                C("transportador", "Transportador", "text", 15), C("destinador", "Destinador", "text", 15),
                C("situacao", "Situação documental informada", "sel", 16, opcoes=SIT_MTR),
            ], minimo=5, impressao=10, extra=[C("obs", "Observações", "text", 100)], atencao=("situacao", "mtr"),
                nota="Registros em situação que exige conferência aparecem destacados. A situação reflete a informação disponível na data de emissão."),
            TEXTO("atencao", "Pontos de atenção",
                  "Foram identificados [QUANTIDADE] registros com informações incompletas ou que dependem de conferência. Os principais pontos são:\n\n[DESCREVA CADA PONTO, INDICANDO A MOVIMENTAÇÃO RELACIONADA E A INFORMAÇÃO QUE FALTA CONFIRMAR.]", 5),
            TEXTO("analise", "Análise do período",
                  "A análise considerou as movimentações registradas entre [DATA INICIAL] e [DATA FINAL]. [DESCREVA A INTERPRETAÇÃO DOS REGISTROS, POR EXEMPLO: CONCENTRAÇÃO DE MOVIMENTAÇÕES EM DETERMINADO RESÍDUO OU DESTINADOR, VARIAÇÕES EM RELAÇÃO AO PERÍODO ANTERIOR OU REGISTROS QUE AINDA DEPENDEM DE CONFIRMAÇÃO.]\n\n"
                  "As situações documentais indicadas na tabela refletem as informações disponíveis na data de emissão e podem mudar após nova consulta ao sistema.", 6),
            TEXTO("final", "Considerações finais",
                  "As movimentações apresentadas neste relatório seguem em acompanhamento conforme a situação documental indicada para cada registro. [COMPLEMENTE COM OS PRÓXIMOS PASSOS PREVISTOS PARA OS REGISTROS QUE EXIGEM CONFERÊNCIA.]\n\n" + FINAL_PADRAO, 4),
            RESP(),
            REFS(),
        ],
    },
    # ============================================================= 03
    {
        "num": "03",
        "titulo": "Relatório de CDFs e destinações",
        "curto": "CDFs e destinações",
        "arquivo": "03_Relatorio_CDFs_Destinacoes",
        "icone": "cert",
        "desc": "Certificados de destinação disponíveis, modalidades informadas e registros a verificar.",
        "secoes": [
            IDENT(),
            TEXTO("objetivo", "Objetivo do relatório",
                  "Este relatório reúne as informações documentais referentes à destinação dos resíduos e aos Certificados de Destinação Final (CDF) relacionados ao período de referência. A existência de um certificado indica a disponibilidade do documento e não substitui a conferência das informações nele registradas.", 4),
            KPIS("Resumo dos registros acompanhados", [
                K("Certificados relacionados", "contar", "cert", tabela="cdfs", campo="cdf"),
                K("Disponíveis", "onde", "check", tabela="cdfs", col="situacao", valores=["Disponível"], tom="ok"),
                K("Aguardando verificação", "onde", "alert", tabela="cdfs", col="situacao", chave="cdf", tom="alerta"),
                K("Destinadores", "distintos", "factory", tabela="cdfs", col="destinador"),
                K("Quantidades certificadas", "unidades", "scale", tabela="cdfs", q="quantidade", u="unidade"),
            ]),
            TAB("cdfs", "Tabela de certificados", [
                C("cdf", "Referência do CDF", "text", 13), C("mtr", "Referência do MTR, quando pertinente", "text", 14), C("residuo", "Resíduo", "text", 15), Q, U,
                C("destinador", "Destinador", "text", 15), C("modalidade", "Modalidade informada", "list", 14, lista="dl-modalidade"),
                C("situacao", "Situação da documentação", "sel", 14, opcoes=SIT_CDF),
            ], minimo=5, impressao=9, extra=[C("periodo", "Data ou período de referência", "text", 30), C("obs", "Observações", "text", 70)],
                atencao=("situacao", "cdf"),
                nota="Um CDF pode se referir a mais de um MTR, e um MTR pode estar relacionado a mais de um certificado. Registre as referências como constam nos documentos."),
            RESUMO("Resumo por modalidade de destinação", "cdfs", "modalidade", "quantidade", "unidade", "Modalidade informada",
                   nota="O resumo considera apenas registros com modalidade, quantidade e unidade preenchidas. Quantidades em unidades diferentes ficam em linhas separadas."),
            GRAF("Quantidades por modalidade de destinação", "barras", "cdfs", rotulo="modalidade", q="quantidade", u="unidade"),
            LISTA_ATENCAO("Certificados pendentes de verificação", "cdfs", [("cdf", "CDF"), ("mtr", "MTR"), ("destinador", "Destinador"), ("situacao", "Situação")], "cdf", "situacao",
                          nota="Lista gerada a partir da tabela de certificados: registros com situação diferente de Disponível."),
            TEXTO("obs_tec", "Observações técnicas e documentais",
                  "As informações desta seção foram organizadas a partir dos certificados e registros disponíveis. Recomenda-se conferir, em cada certificado, os dados do gerador, do destinador, do resíduo, da quantidade e da modalidade de destinação informada, comparando-os com os registros de movimentação correspondentes.\n\n[REGISTRE AQUI OBSERVAÇÕES ESPECÍFICAS SOBRE OS DOCUMENTOS ANALISADOS.]", 5),
            TEXTO("final", "Conclusão",
                  "No período analisado, foram relacionados [QUANTIDADE] certificados ou registros de destinação, conforme a tabela apresentada. [DESCREVA A SITUAÇÃO GERAL DA DOCUMENTAÇÃO, INDICANDO OS REGISTROS QUE AINDA AGUARDAM VERIFICAÇÃO.]\n\n"
                  "Este relatório organiza informações documentais e não constitui declaração de conformidade ambiental.", 4),
            RESP(),
            REFS(),
        ],
    },
    # ============================================================= 04
    {
        "num": "04",
        "titulo": "Relatório de pendências documentais",
        "curto": "Pendências documentais",
        "arquivo": "04_Relatorio_Pendencias_Documentais",
        "icone": "folder",
        "desc": "Pendências registradas, situação de cada uma e providências em andamento.",
        "secoes": [
            IDENT(objetivo="Este relatório apresenta as pendências documentais relacionadas ao controle de resíduos registradas até a data de emissão, com a situação de acompanhamento de cada uma e as providências solicitadas."),
            TEXTO("resumo", "Resumo executivo das pendências",
                  "Até a data de emissão deste relatório, foram registradas as pendências documentais relacionadas na tabela da seção 4. As pendências correspondem a documentos ou informações que ainda dependem de envio, confirmação ou conferência, e cada uma possui um responsável pelo acompanhamento.\n\n[DESTAQUE AQUI AS PENDÊNCIAS QUE EXIGEM MAIOR ATENÇÃO E O MOTIVO.]", 5),
            KPIS("Indicadores", [
                K("Pendências registradas", "contar", "folder", tabela="pend", campo="descricao"),
                K("Em acompanhamento", "onde", "clock", tabela="pend", col="situacao", chave="pend_acomp", tom="info"),
                K("Com resolução informada", "onde", "check", tabela="pend", col="situacao", chave="pend_res", tom="ok"),
                K("Exigem verificação adicional", "onde", "alert", tabela="pend", col="situacao", valores=["Verificação adicional"], tom="alerta"),
            ], nota="Contagens feitas a partir da coluna Situação atual da tabela de pendências."),
            TAB("pend", "Tabela de pendências", [
                C("codigo", "Nº ou código", "text", 9), C("documento", "Documento relacionado", "list", 13, lista="dl-doc"), C("descricao", "Descrição da pendência", "text", 26),
                C("envolvida", "Unidade ou empresa envolvida", "text", 15), C("responsavel", "Responsável", "text", 13), C("data", "Identificação", "date", 12),
                C("situacao", "Situação atual", "sel", 14, opcoes=SIT_PEND),
            ], minimo=5, impressao=8, extra=[C("providencia", "Providência solicitada", "text", 55), C("obs", "Observações", "text", 45)],
                atencao=("situacao", "pend_acomp")),
            GRAF("Pendências por situação", "contagem", "pend", col="situacao", ordem=SIT_PEND),
            TEXTO("atencao", "Principais pontos de atenção",
                  "[DESCREVA AS PENDÊNCIAS QUE PODEM AFETAR O FECHAMENTO DO PERÍODO OU QUE ESTÃO SEM RETORNO HÁ MAIS TEMPO, INDICANDO O RESPONSÁVEL E O PRÓXIMO CONTATO PREVISTO.]", 4),
            TAB("enc", "Providências e encaminhamentos", [
                C("acao", "Providência ou encaminhamento", "text", 44), C("responsavel", "Responsável", "text", 20), C("prazo", "Prazo previsto", "date", 14),
                C("situacao", "Situação", "sel", 16, opcoes=SIT_ACAO),
            ], minimo=3, impressao=4),
            TEXTO("final", "Considerações finais",
                  "As pendências relacionadas neste relatório seguem em acompanhamento conforme as providências indicadas. A classificação de um item como pendência documental indica a necessidade de envio, confirmação ou conferência de informações e não representa, por si só, uma avaliação de conformidade.\n\n[COMPLEMENTE COM A PREVISÃO DA PRÓXIMA ATUALIZAÇÃO DESTE ACOMPANHAMENTO.]", 4),
            RESP(),
            REFS(),
        ],
    },
    # ============================================================= 05
    {
        "num": "05",
        "titulo": "Relatório de coletas realizadas",
        "curto": "Coletas realizadas",
        "arquivo": "05_Relatorio_Coletas_Realizadas",
        "icone": "truck",
        "desc": "Coletas e retiradas do período por data, origem, resíduo e transportador.",
        "secoes": [
            IDENT(),
            TEXTO("objetivo", "Objetivo",
                  "Este relatório apresenta as informações consolidadas sobre as coletas e retiradas de resíduos registradas no período de referência, organizadas por data, unidade de origem, resíduo e transportador.", 3),
            TEXTO("resumo", "Resumo das coletas",
                  "No período de referência foram registradas as coletas relacionadas na tabela da seção 5, realizadas nas unidades de origem indicadas. [DESCREVA BREVEMENTE A ROTINA DE COLETAS NO PERÍODO, COMO FREQUÊNCIA, UNIDADES ATENDIDAS E EVENTUAIS REPROGRAMAÇÕES.]", 4),
            KPIS("Indicadores", [
                K("Coletas registradas", "contar", "truck", tabela="coletas", campo="data"),
                K("Quantidades movimentadas", "unidades", "scale", tabela="coletas", q="quantidade", u="unidade"),
                K("Transportadores envolvidos", "distintos", "route", tabela="coletas", col="transportador"),
                K("Unidades de origem", "distintos", "factory", tabela="coletas", col="origem"),
            ]),
            TAB("coletas", "Tabela de coletas", [
                C("data", "Data", "date", 12), C("origem", "Unidade de origem", "text", 16), C("residuo", "Resíduo", "text", 19), Q, U,
                C("transportador", "Transportador", "text", 16), C("ref", "Referência documental, quando aplicável", "text", 16),
            ], minimo=5, impressao=10, extra=[C("obs", "Observações", "text", 100)]),
            GRAF("Evolução das coletas por mês", "mensal", "coletas", data="data",
                 vazio="O gráfico aparece quando a tabela tiver coletas com data em pelo menos dois meses diferentes."),
            TAB("ocorr", "Ocorrências ou divergências registradas", [
                C("data", "Data", "date", 14), C("ocorrencia", "Ocorrência ou divergência", "text", 46), C("encaminhamento", "Encaminhamento", "text", 40),
            ], minimo=2, impressao=3),
            TEXTO("analise", "Análise do período",
                  "[DESCREVA A INTERPRETAÇÃO DOS REGISTROS DE COLETA, COMO CONCENTRAÇÃO EM DETERMINADAS DATAS OU UNIDADES, VARIAÇÃO DE QUANTIDADES POR RESÍDUO E COLETAS QUE TIVERAM OCORRÊNCIAS.]\n\nAs quantidades consideradas são as registradas nas coletas, na unidade de medida informada em cada registro.", 5),
            TEXTO("final", "Conclusão",
                  "As coletas do período foram registradas conforme a tabela apresentada. [COMPLEMENTE COM OS PONTOS QUE SEGUEM EM ACOMPANHAMENTO, COMO DOCUMENTOS RELACIONADOS ÀS COLETAS OU OCORRÊNCIAS AINDA EM ANÁLISE.]\n\n" + FINAL_PADRAO, 4),
            RESP(),
            REFS(),
        ],
    },
    # ============================================================= 06
    {
        "num": "06",
        "titulo": "Relatório de divergências",
        "curto": "Divergências",
        "arquivo": "06_Relatorio_Divergencias",
        "icone": "compare",
        "desc": "Divergências identificadas, verificação realizada e encaminhamento de cada caso.",
        "secoes": [
            IDENT(objetivo="Este relatório documenta as divergências identificadas durante o controle documental e o acompanhamento das movimentações de resíduos, registrando a informação original, a verificação realizada e o encaminhamento de cada caso."),
            TEXTO("contexto", "Contextualização",
                  "Durante o acompanhamento do período, algumas informações registradas em documentos ou movimentações apresentaram diferenças em relação a outros registros ou à verificação posterior. Este relatório reúne esses casos para que sejam acompanhados até o esclarecimento.\n\n"
                  "Uma divergência indica a necessidade de verificação e não significa, por si só, erro ou descumprimento de responsabilidade de qualquer das partes.", 5),
            KPIS("Resumo das divergências", [
                K("Divergências registradas", "contar", "compare", tabela="div", campo="descricao"),
                K("Em verificação ou aguardando retorno", "onde", "clock", tabela="div", col="situacao", chave="div_acomp", tom="info"),
                K("Esclarecidas ou encerradas", "onde", "check", tabela="div", col="situacao", chave="div_res", tom="ok"),
            ]),
            GRAF("Divergências por tipo", "contagem", "div", col="tipo", ordem=TIPO_DIV),
            TAB("div", "Tabela de registros", [
                C("ref", "Referência", "text", 11), C("data", "Identificação", "date", 12), C("envolvido", "Documento ou movimentação", "text", 18),
                C("tipo", "Tipo de divergência", "sel", 15, opcoes=TIPO_DIV), C("contato", "Responsável contatado", "text", 16),
                C("situacao", "Situação do acompanhamento", "sel", 15, opcoes=SIT_DIV),
            ], minimo=4, impressao=6, extra=[
                C("descricao", "Descrição objetiva", "text", 100), C("original", "Informação originalmente registrada", "text", 50),
                C("verificada", "Informação posteriormente verificada", "text", 50), C("providencia", "Providência informada", "text", 100),
            ], atencao=("situacao", "div_acomp")),
            DESTAQUES("Análise das divergências", [
                ("identificada", "Situação identificada", "alerta", "[DESCREVA O QUE FOI IDENTIFICADO, EM QUAIS DOCUMENTOS OU MOVIMENTAÇÕES E EM QUE DATA.]"),
                ("verificacao", "Verificação realizada", "info", "[DESCREVA COMO A INFORMAÇÃO FOI VERIFICADA E QUAIS REGISTROS FORAM COMPARADOS.]"),
                ("encaminhamento", "Encaminhamento", "neutro", "[INDIQUE A QUEM A DIVERGÊNCIA FOI COMUNICADA E QUAL PROVIDÊNCIA FOI SOLICITADA.]"),
                ("atual", "Situação atual", "ok", "[INFORME A SITUAÇÃO NA DATA DE EMISSÃO. CONSIDERE ESCLARECIDA APENAS A DIVERGÊNCIA COM CONFIRMAÇÃO DOCUMENTADA.]"),
            ], texto=("analise", "[COMPLEMENTE COM UMA ANÁLISE GERAL DAS DIVERGÊNCIAS DO PERÍODO, COMO TIPOS MAIS FREQUENTES E DOCUMENTOS ENVOLVIDOS.]")),
            TAB("prov", "Providências solicitadas", [
                C("providencia", "Providência", "text", 40), C("a_quem", "Solicitada a", "text", 22), C("data", "Data", "date", 13), C("retorno", "Retorno recebido", "text", 25),
            ], minimo=3, impressao=4),
            REFS(4),
            TEXTO("final", "Conclusão",
                  "As divergências relacionadas neste relatório foram registradas para acompanhamento. A situação de cada caso corresponde às informações disponíveis na data de emissão, e somente devem ser consideradas esclarecidas aquelas com confirmação documentada.\n\n[COMPLEMENTE COM OS PRÓXIMOS PASSOS.]", 4),
            RESP(),
        ],
    },
    # ============================================================= 07
    {
        "num": "07",
        "titulo": "Relatório de acompanhamento de destinadores",
        "curto": "Destinadores",
        "arquivo": "07_Relatorio_Acompanhamento_Destinadores",
        "icone": "factory",
        "desc": "Destinadores envolvidos, resíduos encaminhados, documentos e pontos de atenção.",
        "secoes": [
            IDENT(),
            TEXTO("objetivo", "Objetivo",
                  "Este relatório apresenta uma visão gerencial das unidades destinadoras envolvidas nas movimentações acompanhadas no período, reunindo resíduos encaminhados, quantidades registradas, referências documentais e situação do acompanhamento. O documento não emite parecer sobre regularidade, licenciamento ou habilitação dos destinadores.", 4),
            KPIS("Relação de destinadores acompanhados", [
                K("Destinadores acompanhados", "distintos", "factory", tabela="dest", col="empresa"),
                K("Registros na tabela", "contar", "doc", tabela="dest", campo="empresa"),
                K("Com pendências ou em verificação", "onde", "alert", tabela="dest", col="situacao", chave="dest", tom="alerta"),
            ]),
            CARDS("Destinadores", "dest", "empresa", "quantidade", "unidade", "situacao", "residuos"),
            TAB("dest", "Tabela de informações", [
                C("empresa", "Empresa", "text", 16), C("unidade_dest", "Unidade destinadora", "text", 15), C("residuos", "Resíduos encaminhados", "text", 18), Q, U,
                C("modalidade", "Modalidade informada", "list", 14, lista="dl-modalidade"), C("situacao", "Situação do acompanhamento documental", "sel", 16, opcoes=SIT_DEST),
            ], minimo=4, impressao=6, extra=[C("refs", "Referências documentais", "text", 45), C("obs", "Observações", "text", 55)],
                atencao=("situacao", "dest")),
            RESUMO("Resumo por destinador", "dest", "empresa", "quantidade", "unidade", "Empresa destinadora", situacao="situacao",
                   nota="Resumo calculado a partir da tabela: número de registros e soma das quantidades em cada unidade de medida."),
            GRAF("Quantidades por destinador", "barras", "dest", rotulo="empresa", q="quantidade", u="unidade"),
            TAB("pend_doc", "Documentos ou informações pendentes de conferência", [
                C("destinador", "Destinador", "text", 24), C("documento", "Documento ou informação", "text", 36), C("data", "Solicitado em", "date", 14),
                C("situacao", "Situação", "sel", 16, opcoes=SIT_PEND),
            ], minimo=3, impressao=4),
            TEXTO("atencao", "Pontos de atenção", "[DESCREVA OS PONTOS QUE PRECISAM DE ACOMPANHAMENTO EM RELAÇÃO A CADA DESTINADOR, COMO DOCUMENTOS AGUARDANDO ENVIO OU INFORMAÇÕES A CONFERIR.]", 4),
            TEXTO("final", "Conclusão",
                  "As unidades destinadoras relacionadas neste relatório foram acompanhadas com base nos registros e documentos disponíveis no período. [COMPLEMENTE COM A SITUAÇÃO GERAL DO ACOMPANHAMENTO DOCUMENTAL.]\n\n"
                  "Este relatório não emite parecer sobre regularidade, licenciamento ou habilitação das empresas destinadoras, que devem ser verificados nos documentos e sistemas aplicáveis.", 4),
            RESP(),
            REFS(),
        ],
    },
    # ============================================================= 08
    {
        "num": "08",
        "titulo": "Relatório de quantidades por tipo de resíduo",
        "curto": "Quantidades por resíduo",
        "arquivo": "08_Relatorio_Quantidades_Tipo_Residuo",
        "icone": "scale",
        "desc": "Quantidades por resíduo e origem, com gráficos e comparação entre períodos.",
        "secoes": [
            IDENT(),
            TEXTO("objetivo", "Objetivo",
                  "Este relatório apresenta as quantidades de resíduos registradas no período de referência, organizadas por tipo de resíduo, origem e unidade de medida. As quantidades são apresentadas na unidade em que foram registradas, sem conversões entre unidades.", 3),
            KPIS("Resumo quantitativo", [
                K("Tipos de resíduo", "distintos", "drum", tabela="qtd", col="residuo"),
                K("Registros", "contar", "doc", tabela="qtd", campo="residuo"),
                K("Quantidades registradas", "unidades", "scale", tabela="qtd", q="quantidade", u="unidade"),
            ], nota="Quantidades em kg, t, L, m³ ou volumes são somadas apenas dentro da mesma unidade de medida."),
            TAB("qtd", "Tabela principal", [
                C("residuo", "Resíduo", "text", 22), C("codigo", "Código, quando aplicável", "text", 12), C("origem", "Unidade ou setor de origem", "text", 17), Q, U,
                C("periodo", "Período de referência", "text", 14), C("obs", "Observações", "text", 16),
            ], minimo=5, impressao=9),
            GRAF("Distribuição por tipo de resíduo", "barras", "qtd", rotulo="residuo", q="quantidade", u="unidade"),
            TAB("comp", "Comparação entre períodos, quando houver dados disponíveis", [
                C("residuo", "Resíduo", "text", 30), C("unidade", "Unidade de medida", "unit", 14), C("anterior", "Período anterior", "num", 16),
                C("atual", "Período atual", "num", 16), C("variacao", "Variação", "var", 24),
            ], minimo=3, impressao=5, sub=[("per_ant", "Período anterior"), ("per_atual", "Período atual")],
                nota="A variação é calculada linha a linha (atual menos anterior), sempre na mesma unidade de medida."),
            GRAF("Comparação entre períodos", "comparacao", "comp", rotulo="residuo", u="unidade", a="anterior", b="atual"),
            TEXTO("analise", "Análise gerencial",
                  "[DESCREVA OS RESÍDUOS COM MAIOR QUANTIDADE REGISTRADA, AS ORIGENS MAIS RELEVANTES E AS VARIAÇÕES OBSERVADAS EM RELAÇÃO AO PERÍODO ANTERIOR, QUANDO HOUVER DADOS COMPARÁVEIS.]\n\nAs quantidades consideradas são as registradas nos controles do período e podem ser revistas após a conferência dos documentos correspondentes.", 5),
            TEXTO("final", "Conclusão",
                  "As quantidades apresentadas neste relatório correspondem aos registros disponíveis no período, na unidade de medida informada em cada caso. [COMPLEMENTE COM OS PRINCIPAIS PONTOS PARA ACOMPANHAMENTO.]\n\n" + FINAL_PADRAO, 4),
            RESP(),
            REFS(),
        ],
    },
    # ============================================================= 09
    {
        "num": "09",
        "titulo": "Relatório de acompanhamento para clientes",
        "curto": "Para clientes",
        "arquivo": "09_Relatorio_Acompanhamento_Clientes",
        "icone": "briefcase",
        "desc": "Modelo para consultorias apresentarem ao cliente as atividades e a situação documental.",
        "capa": True,
        "secoes": [
            CAPA("cliente"),
            TEXTO("apresentacao", "Apresentação",
                  "Prezados,\n\nApresentamos o relatório de acompanhamento da gestão de resíduos referente ao período indicado, elaborado a partir das informações e dos documentos disponibilizados pela [EMPRESA CLIENTE] e dos registros do acompanhamento realizado por [CONSULTORIA OU RESPONSÁVEL].\n\n"
                  "Este documento dá visibilidade às atividades acompanhadas, à situação documental e aos pontos que seguem em acompanhamento, para apoiar as decisões da equipe responsável.", 6),
            CHECKS("escopo", "Escopo do acompanhamento", [
                "Acompanhamento de coletas e retiradas", "Conferência de MTRs", "Acompanhamento de CDFs", "Organização de documentos",
                "Comunicação com transportadores", "Comunicação com destinadores", "Atualização de controles internos", "Levantamento de quantidades",
            ], "Marque somente as atividades efetivamente realizadas no período."),
            TEXTO("atividades", "Resumo das atividades",
                  "Durante o período, foram realizadas as atividades marcadas no escopo acima. [DESCREVA AS PRINCIPAIS ATIVIDADES, COM DATAS E RESULTADOS OBSERVADOS.]", 5),
            KPIS("Destaques do período", [
                K("Movimentações acompanhadas", "celula", "route", tabela="quadro", linha=0, col="quantidade"),
                K("MTRs relacionados", "celula", "doc", tabela="quadro", linha=1, col="quantidade"),
                K("CDFs disponíveis", "celula", "cert", tabela="quadro", linha=2, col="quantidade"),
                K("Coletas registradas", "celula", "truck", tabela="quadro", linha=4, col="quantidade"),
            ], nota="Os destaques repetem os números informados no quadro abaixo."),
            TAB("quadro", "Quadro de movimentações e documentos", [
                C("item", "Item", "text", 40), C("quantidade", "Quantidade", "num", 16), C("obs", "Observação", "text", 44),
            ], minimo=5, impressao=6, pre=["Movimentações acompanhadas", "MTRs relacionados", "CDFs disponíveis", "CDFs pendentes de verificação", "Coletas registradas"]),
            TAB("pend", "Pendências identificadas", [
                C("pendencia", "Pendência", "text", 40), C("responsavel", "Responsável", "text", 20), C("situacao", "Situação", "sel", 16, opcoes=SIT_PEND), C("obs", "Observação", "text", 24),
            ], minimo=3, impressao=4, atencao=("situacao", "pend_acomp")),
            TAB("prov", "Providências e encaminhamentos", [
                C("providencia", "Providência ou encaminhamento", "text", 42), C("responsavel", "Responsável", "text", 20), C("data", "Data", "date", 14), C("situacao", "Situação", "sel", 16, opcoes=SIT_ACAO),
            ], minimo=3, impressao=4),
            TAB("proximos", "Próximos pontos de acompanhamento", [
                C("ponto", "Ponto de acompanhamento", "text", 50), C("responsavel", "Responsável", "text", 24), C("previsao", "Previsão", "date", 16),
            ], minimo=3, impressao=4),
            TEXTO("final", "Considerações finais",
                  "Seguimos à disposição para esclarecimentos sobre as informações apresentadas. Os pontos indicados como pendentes ou em acompanhamento continuarão sendo acompanhados no próximo período, conforme o escopo acordado. [COMPLEMENTE COM ORIENTAÇÕES OU COMBINADOS COM O CLIENTE.]\n\n" + FINAL_PADRAO, 5),
            RESP(consultoria=True),
            REFS(),
        ],
    },
    # ============================================================= 10
    {
        "num": "10",
        "titulo": "Relatório executivo de gestão de resíduos",
        "curto": "Executivo",
        "arquivo": "10_Relatorio_Executivo_Gestao_Residuos",
        "icone": "chart",
        "desc": "Painel sintético para gestores: indicadores, situação documental e ações recomendadas.",
        "capa": True,
        "secoes": [
            CAPA("executiva"),
            TEXTO("resumo", "Resumo executivo",
                  "Este relatório apresenta, de forma sintética, os principais resultados da gestão de resíduos no período de referência, selecionados pelo responsável para apoiar a tomada de decisão.\n\n[DESCREVA EM POUCAS LINHAS O PANORAMA DO PERÍODO E O QUE PRECISA DE DECISÃO OU APOIO DA GESTÃO.]", 5),
            MANCHETES("destaques", "Principais resultados do período", 3),
            KPIS("Painel de indicadores", [
                K("Quantidades registradas", "unidades", "scale", tabela="panorama", q="quantidade", u="unidade"),
                K("Movimentações acompanhadas", "soma", "route", tabela="panorama", col="movs"),
                K("Coletas realizadas", "manual", "truck", k="coletas", ajuda="Informe o número de coletas do período."),
                K("Documentação acompanhada", "soma", "doc", tabela="docs", col="total"),
                K("Pendências identificadas", "soma", "alert", tabela="docs", col="pend", tom="alerta"),
                K("Pendências resolvidas, quando confirmado", "manual", "check", k="resolvidas", tom="ok", ajuda="Informe apenas resoluções confirmadas."),
            ], nota="Quantidades e somas vêm das tabelas das seções 4 e 5. Coletas e pendências resolvidas são informadas pelo responsável."),
            TAB("panorama", "Panorama das movimentações", [
                C("residuo", "Resíduo", "text", 34), Q, U, C("movs", "Nº de movimentações", "num", 14), C("obs", "Observação", "text", 30),
            ], minimo=4, impressao=6),
            GRAF("Quantidades por resíduo", "barras", "panorama", rotulo="residuo", q="quantidade", u="unidade"),
            TAB("docs", "Situação documental", [
                C("documento", "Documento", "text", 28), C("total", "Total acompanhado", "num", 16), C("pend", "Com pendência", "num", 16), C("obs", "Observação", "text", 40),
            ], minimo=3, impressao=4, pre=["MTR", "CDF", "Outros documentos"]),
            GRAF("Documentos acompanhados e com pendência", "pares", "docs", rotulo="documento", a="total", b="pend", la="Total acompanhado", lb="Com pendência"),
            TAB("atencao", "Principais pontos de atenção", [
                C("ponto", "Ponto de atenção", "text", 46), C("impacto", "Possível impacto", "text", 30), C("prioridade", "Prioridade", "sel", 14, opcoes=PRIORIDADE),
            ], minimo=3, impressao=4),
            TAB("acoes", "Providências e ações recomendadas pelo responsável", [
                C("acao", "Ação recomendada", "text", 44), C("responsavel", "Responsável", "text", 20), C("prazo", "Prazo", "date", 14), C("prioridade", "Prioridade", "sel", 14, opcoes=PRIORIDADE),
            ], minimo=3, impressao=4),
            TAB("proximos", "Próximos acompanhamentos", [
                C("item", "Acompanhamento", "text", 50), C("data", "Data prevista", "date", 16), C("responsavel", "Responsável", "text", 26),
            ], minimo=3, impressao=3),
            TEXTO("final", "Conclusão executiva",
                  "[RESUMA EM DUAS OU TRÊS FRASES A SITUAÇÃO DO PERÍODO E AS DECISÕES OU APOIOS NECESSÁRIOS.]\n\nAs informações deste relatório foram selecionadas pelo responsável a partir dos registros disponíveis e devem ser lidas junto com os relatórios e documentos de apoio.", 4),
            RESP(),
            REFS(),
        ],
    },
]
