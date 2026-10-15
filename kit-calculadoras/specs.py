# -*- coding: utf-8 -*-
"""Especificação das 6 calculadoras: entradas, exemplos, fórmulas, validações e textos."""
from nucleo import (FMT_PCT, FMT_POS, FMT_SIG, N, S, arr, chk_nn, chk_pos, chk_un, fator, lit)

VOL_U = ["m³", "L"]
VOL_F = [1, 0.001]
TEMPO_U = ["s", "min", "h", "dia"]
TEMPO_F = [1, 60, 3600, 86400]
DIAM_U = ["m", "cm", "mm", "pol"]
DIAM_F = [1, 0.01, 0.001, 0.0254]
VAZAO_U = ["m³/s", "L/s", "m³/h", "m³/dia"]
VAZAO_F = [1, 0.001, "1/3600", "1/86400"]
VAZAOD_U = ["m³/dia", "m³/h", "L/s"]
VAZAOD_F = [1, 24, 86.4]
PARAM = ["DBO", "DQO", "SST", "Nitrogênio total", "Fósforo total", "Óleos e graxas", "Outro parâmetro"]
CONC_U = ["mg/L", "g/L", "µg/L", "% (m/v)", "mol/L", "mmol/L"]
CONC_F = [1, 1000, 0.001, 10000, 1, 0.001]
CONC_FAM = [1, 1, 1, 1, 2, 2]
VOLLAB_U = ["mL", "L", "µL"]
VOLLAB_F = [1, 1000, 0.001]
MODOS = ["V₁ (volume de estoque)", "C₂ (concentração final)", "V₂ (volume final)", "C₁ (concentração do estoque)"]
MASSA_U = ["kg/dia", "g/dia", "kg/h", "g/s", "t/ano"]


def num(key, label, sym, ex, unit, hint, my=None, kind="num"):
    return dict(key=key, label=label, sym=sym, ex=ex, unit=unit, hint=hint, my=my, kind=kind)


def lst(key, label, ex, opts, hint, my=None, show=False):
    return dict(key=key, label=label, ex=ex, opts=opts, hint=hint, my=my if my is not None else ex[0],
                kind="list", show=show)


def entenda_padrao(formula, variaveis, subst, resultado):
    return [
        ("Fórmula", "formula", formula),
        ("O que é cada variável", "static", variaveis),
        ("Valores inseridos", "live", None),
        ("Substituição", "dyn", subst),
        ("Resultado", "dyn", resultado),
    ]


# =================================================================== CALC 01
c1t1 = dict(
    title="Vazão a partir de volume e tempo", short="Vazão por volume e tempo",
    desc="Calcula a vazão quando você sabe quanto volume passou e em quanto tempo. O resultado sai "
         "automaticamente em m³/s, m³/h, L/s e m³/dia.",
    inputs=[
        num("V", "Volume", "V", (360, 15000), "@uV", "Volume que passou, encheu ou esvaziou. Ex.: 360"),
        lst("uV", "Unidade do volume", ("m³", "L"), VOL_U, "Escolha m³ ou L na lista."),
        num("t", "Tempo", "t", (2, 25), "@ut", "Tempo gasto para esse volume passar. Ex.: 2"),
        lst("ut", "Unidade do tempo", ("h", "min"), TEMPO_U, "Escolha s, min, h ou dia.", my="h"),
    ],
    calcs=[
        ("fV", fator("uV", VOL_U, VOL_F)), ("ft", fator("ut", TEMPO_U, TEMPO_F)),
        ("Vm", "[V]*[fV]"), ("ts", "[t]*[ft]"), ("Qs", "[Vm]/[ts]"),
        ("Qh", "[Qs]*3600"), ("Ql", "[Qs]*1000"), ("Qd", "[Qs]*86400"),
    ],
    checks=chk_pos("V", "o volume") + chk_un("fV", "o volume") + chk_pos("t", "o tempo") + chk_un("ft", "o tempo"),
    main=("VAZÃO EM m³/h", "Qh", "m³/h", FMT_POS),
    sec=[("Vazão em m³/s", "Qs", "m³/s", FMT_POS), ("Vazão em L/s", "Ql", "L/s", FMT_POS),
         ("Vazão em m³/dia", "Qd", "m³/dia", FMT_POS)],
    interp=S("A cada hora passam {Qh} m³ de líquido. Isso é o mesmo que {Ql} litros por segundo, "
             "ou {Qd} m³ por dia."),
    entenda=entenda_padrao(
        "Q = V ÷ t",
        "Q = vazão (volume que passa por unidade de tempo)   |   V = volume   |   t = tempo gasto",
        S("Convertendo para o SI: V = {Vm} m³ e t = {ts} s.{/}Q = {Vm} ÷ {ts} = {Qs} m³/s"),
        S("Q = {Qh} m³/h = {Ql} L/s = {Qs} m³/s = {Qd} m³/dia")),
    resol=S("1) Converter para o SI: V = {Vm} m³ e t = {ts} s.{/}2) Q = V ÷ t = {Vm} ÷ {ts} = {Qs} m³/s."
            "{/}3) Converter: × 1000 = {Ql} L/s;  × 3600 = {Qh} m³/h;  × 86400 = {Qd} m³/dia."),
    result=S("Q = {Qh} m³/h = {Ql} L/s = {Qs} m³/s"),
    guia=dict(
        interpretar="Quanto maior a vazão, mais volume passa no mesmo tempo. Use m³/s em fórmulas de "
                    "hidráulica e m³/dia em cálculos de carga e dosagem.",
        erro="Esquecer de converter o tempo antes de dividir. 360 m³ em 2 h dá 180 m³/h, e não 180 m³/s.",
        dica="Guarde esta relação: 1 L/s = 3,6 m³/h = 86,4 m³/dia."),
    ex_info=[
        ("Enchimento de tanque por bomba",
         "Uma bomba enche um tanque de 360 m³ em 2 horas. Qual é a vazão da bomba?"),
        ("Esvaziamento de reservatório",
         "Um reservatório com 15.000 litros foi esvaziado em 25 minutos. Qual foi a vazão média de saída?"),
    ],
)

c1t2 = dict(
    title="Vazão em tubulações", short="Vazão em tubulações",
    desc="Calcula a área da seção de um tubo circular e a vazão transportada a partir do diâmetro interno "
         "e da velocidade média do escoamento.",
    inputs=[
        num("D", "Diâmetro interno", "D", (0.30, 150), "@uD", "Diâmetro interno do tubo (não use o raio). Ex.: 0,30"),
        lst("uD", "Unidade do diâmetro", ("m", "mm"), DIAM_U, "Escolha m, cm, mm ou pol."),
        num("v", "Velocidade média", "v", (1.5, 0.8), "m/s", "Velocidade média da água no tubo. Ex.: 1,5"),
    ],
    calcs=[
        ("fD", fator("uD", DIAM_U, DIAM_F)), ("Dm", "[D]*[fD]"), ("A", "PI()*[Dm]^2/4"),
        ("Q", "[A]*[v]"), ("Ql", "[Q]*1000"), ("Qh", "[Q]*3600"),
    ],
    checks=chk_pos("D", "o diâmetro") + chk_un("fD", "o diâmetro") + chk_pos("v", "a velocidade"),
    main=("VAZÃO EM m³/s", "Q", "m³/s", FMT_POS),
    sec=[("Área da seção", "A", "m²", FMT_POS), ("Vazão em L/s", "Ql", "L/s", FMT_POS),
         ("Vazão em m³/h", "Qh", "m³/h", FMT_POS)],
    interp=S("Pela seção de {A} m² passam {Ql} litros por segundo.") +
    '&IF(OR([v]<0.6,[v]>3),' + S(" Atenção: a velocidade informada está fora da faixa de referência usual "
                                 "em tubulações de água (cerca de 0,6 a 3 m/s). Confira o dado.") + ',"")',
    entenda=entenda_padrao(
        "Q = A × v,   com   A = π × D² ÷ 4",
        "Q = vazão   |   A = área interna da seção   |   D = diâmetro interno   |   v = velocidade média",
        S("D em metros = {Dm} m.{/}A = π × {Dm}² ÷ 4 = {A} m²   →   Q = {A} × {v} = {Q} m³/s"),
        S("Área = {A} m²   |   Q = {Q} m³/s = {Ql} L/s = {Qh} m³/h")),
    resol=S("1) Diâmetro em metros: D = {Dm} m.{/}2) Área: A = π × {Dm}² ÷ 4 = {A} m².{/}"
            "3) Vazão: Q = A × v = {A} × {v} = {Q} m³/s (× 1000 = {Ql} L/s)."),
    result=S("A = {A} m²   |   Q = {Q} m³/s = {Ql} L/s"),
    guia=dict(
        interpretar="O resultado mostra quanto líquido o tubo transporta com aquela velocidade. Para "
                    "levar mais vazão, aumente o diâmetro ou aceite uma velocidade maior.",
        erro="Usar o diâmetro em mm ou cm direto na fórmula, ou usar o raio no lugar do diâmetro. "
             "Converta para metros antes: 150 mm = 0,15 m.",
        dica="Use sempre o diâmetro interno. O diâmetro nominal (DN) do catálogo pode ser diferente do interno."),
    ex_info=[
        ("Adutora de água tratada",
         "Uma adutora tem diâmetro interno de 0,30 m e a água escoa a 1,5 m/s. Qual é a vazão transportada?"),
        ("Tubo de esgoto tratado",
         "Um tubo com 150 mm de diâmetro interno conduz esgoto tratado a 0,8 m/s. Qual é a vazão?"),
    ],
)

c1t3 = dict(
    title="Velocidade do escoamento", short="Velocidade do escoamento",
    desc="Calcula a velocidade média do líquido dentro de um tubo circular a partir da vazão e do diâmetro interno.",
    inputs=[
        num("Q", "Vazão", "Q", (0.05, 20), "@uQ", "Vazão que passa pelo tubo. Ex.: 0,05"),
        lst("uQ", "Unidade da vazão", ("m³/s", "L/s"), VAZAO_U, "Escolha m³/s, L/s, m³/h ou m³/dia."),
        num("D", "Diâmetro interno", "D", (0.20, 100), "@uD", "Diâmetro interno do tubo. Ex.: 0,20"),
        lst("uD", "Unidade do diâmetro", ("m", "mm"), DIAM_U, "Escolha m, cm, mm ou pol."),
    ],
    calcs=[
        ("fQ", fator("uQ", VAZAO_U, VAZAO_F)), ("Qs", "[Q]*[fQ]"),
        ("fD", fator("uD", DIAM_U, DIAM_F)), ("Dm", "[D]*[fD]"), ("A", "PI()*[Dm]^2/4"), ("vel", "[Qs]/[A]"),
    ],
    checks=chk_pos("Q", "a vazão") + chk_un("fQ", "a vazão") + chk_pos("D", "o diâmetro") + chk_un("fD", "o diâmetro"),
    main=("VELOCIDADE MÉDIA", "vel", "m/s", FMT_POS),
    sec=[("Área da seção", "A", "m²", FMT_POS), ("Vazão em m³/s", "Qs", "m³/s", FMT_POS),
         ("Diâmetro em metros", "Dm", "m", FMT_POS)],
    interp=S("O líquido percorre {vel} metros a cada segundo dentro do tubo.") +
    '&IF([vel]<0.6,' + S(" A velocidade está abaixo de 0,6 m/s: valores baixos favorecem o depósito de sólidos.") +
    ',IF([vel]>3,' + S(" A velocidade está acima de 3 m/s: valores altos aumentam a perda de carga e o risco de "
                       "golpe de aríete.") +
    ',' + S(" A velocidade está dentro da faixa de referência usual (cerca de 0,6 a 3 m/s).") + '))',
    entenda=entenda_padrao(
        "v = Q ÷ A,   com   A = π × D² ÷ 4",
        "v = velocidade média   |   Q = vazão   |   A = área interna da seção   |   D = diâmetro interno",
        S("Q = {Qs} m³/s e D = {Dm} m.{/}A = π × {Dm}² ÷ 4 = {A} m²   →   v = {Qs} ÷ {A} = {vel} m/s"),
        S("v = {vel} m/s")),
    resol=S("1) Converter: Q = {Qs} m³/s e D = {Dm} m.{/}2) Área: A = π × {Dm}² ÷ 4 = {A} m².{/}"
            "3) Velocidade: v = Q ÷ A = {Qs} ÷ {A} = {vel} m/s."),
    result=S("v = {vel} m/s"),
    guia=dict(
        interpretar="A velocidade indica se o tubo está bem dimensionado. Muito baixa favorece depósitos; "
                    "muito alta gasta mais energia e desgasta a tubulação.",
        erro="Misturar unidades: vazão em L/s com área em m². Converta a vazão para m³/s antes de dividir.",
        dica="Se a velocidade ficar alta demais, teste um diâmetro maior e veja o resultado mudar na hora."),
    ex_info=[
        ("Velocidade em uma tubulação de 0,20 m",
         "Uma tubulação de 0,20 m de diâmetro interno transporta 0,05 m³/s. Qual é a velocidade média?"),
        ("Linha de recalque de 100 mm",
         "Uma linha de recalque com 100 mm de diâmetro interno recebe 20 L/s. Qual é a velocidade?"),
    ],
)

c1t4 = dict(
    title="Tempo de detenção hidráulica (TDH)", short="Tempo de detenção (TDH)",
    desc="Calcula quanto tempo, em média, o líquido permanece dentro de um tanque, reator ou lagoa.",
    inputs=[
        num("V", "Volume útil", "V", (500, 1200), "@uV", "Volume ocupado pelo líquido na unidade. Ex.: 500"),
        lst("uV", "Unidade do volume", ("m³", "m³"), VOL_U, "Escolha m³ ou L."),
        num("Q", "Vazão de entrada", "Q", (50, 4800), "@uQ", "Vazão que entra na unidade. Ex.: 50"),
        lst("uQ", "Unidade da vazão", ("m³/h", "m³/dia"), VAZAO_U, "Escolha m³/s, L/s, m³/h ou m³/dia.", my="m³/h"),
    ],
    calcs=[
        ("fV", fator("uV", VOL_U, VOL_F)), ("Vm", "[V]*[fV]"),
        ("fQ", fator("uQ", VAZAO_U, VAZAO_F)), ("Qh", "[Q]*[fQ]*3600"),
        ("th", "[Vm]/[Qh]"), ("tm", "[th]*60"), ("td", "[th]/24"),
    ],
    checks=chk_pos("V", "o volume útil") + chk_un("fV", "o volume") + chk_pos("Q", "a vazão") + chk_un("fQ", "a vazão"),
    main=("TEMPO DE DETENÇÃO", "th", "horas", FMT_POS),
    sec=[("Em minutos", "tm", "min", FMT_POS), ("Em dias", "td", "dias", FMT_POS)],
    interp=S("Em média, cada porção de líquido fica {th} horas ({tm} minutos) dentro da unidade antes de sair."),
    entenda=entenda_padrao(
        "TDH = V ÷ Q",
        "TDH = tempo de detenção hidráulica   |   V = volume útil   |   Q = vazão de entrada",
        S("V = {Vm} m³ e Q = {Qh} m³/h.{/}TDH = {Vm} ÷ {Qh} = {th} h"),
        S("TDH = {th} h = {tm} min")),
    resol=S("1) Converter: V = {Vm} m³ e Q = {Qh} m³/h.{/}2) TDH = V ÷ Q = {Vm} ÷ {Qh} = {th} h.{/}"
            "3) Em minutos: {th} × 60 = {tm} min."),
    result=S("TDH = {th} h = {tm} min"),
    guia=dict(
        interpretar="O TDH é o tempo disponível para os processos acontecerem (decantação, reações, mistura). "
                    "Compare com o valor recomendado para a unidade que você está estudando.",
        erro="Usar o volume total do tanque. O cálculo usa o volume útil, ocupado de fato pelo líquido.",
        dica="Para descobrir o volume necessário, inverta a fórmula: V = TDH × Q."),
    ex_info=[
        ("Tanque de equalização",
         "Um tanque de equalização tem volume útil de 500 m³ e recebe 50 m³/h. Quanto tempo o efluente fica no tanque?"),
        ("Lagoa de estabilização",
         "Uma lagoa com 1.200 m³ de volume útil recebe 4.800 m³/dia. Qual é o tempo de detenção?"),
    ],
)

# =================================================================== CALC 02
c2t1 = dict(
    title="Calcular carga poluidora", short="Calcular carga",
    desc="Calcula a massa de poluente transportada por dia a partir da vazão e da concentração. "
         "O parâmetro escolhido só identifica o cálculo; a fórmula é a mesma para todos.",
    inputs=[
        lst("P", "Parâmetro", ("DBO", "SST"), PARAM, "Escolha o parâmetro (serve para identificar o resultado).", show=True),
        num("Q", "Vazão", "Q", (400, 5), "@uQ", "Vazão da corrente. Ex.: 400"),
        lst("uQ", "Unidade da vazão", ("m³/dia", "L/s"), VAZAOD_U, "Escolha m³/dia, m³/h ou L/s."),
        num("C", "Concentração", "C", (180, 250), "mg/L", "Concentração do parâmetro em mg/L. Ex.: 180"),
    ],
    calcs=[
        ("fQ", fator("uQ", VAZAOD_U, VAZAOD_F)), ("Qd", "[Q]*[fQ]"), ("kg", "[Qd]*[C]*0.001"),
        ("g", "[kg]*1000"), ("ano", "[kg]*365"), ("hab", "ROUND([kg]*1000/54,0)"),
    ],
    checks=chk_un("fQ", "a vazão") + chk_pos("Q", "a vazão") + chk_nn("C", "a concentração"),
    main=('="CARGA DE "&UPPER([P])', "kg", "kg/dia", FMT_POS),
    sec=[("Carga em g/dia", "g", "g/dia", FMT_POS), ("Carga anual (365 dias)", "ano", "kg/ano", FMT_POS),
         ("Vazão usada", "Qd", "m³/dia", FMT_POS)],
    interp=S("Por dia, a corrente transporta {kg} kg de {@P}. Essa é a massa que chega ao destino em 24 horas.") +
    '&IF([P]="DBO",' + S(" Isso equivale ao esgoto de aproximadamente {hab} pessoas (referência usual de 54 g "
                         "de DBO por habitante por dia).") + ',"")',
    entenda=entenda_padrao(
        "Carga (kg/dia) = Q (m³/dia) × C (mg/L) × 0,001",
        "Q = vazão em m³/dia   |   C = concentração em mg/L   |   0,001 = converte g em kg (1 mg/L = 1 g/m³)",
        S("Carga = {Qd} m³/dia × {C} mg/L × 0,001 = {kg} kg/dia"),
        S("Carga de {@P} = {kg} kg/dia = {g} g/dia")),
    resol=S("1) Vazão em m³/dia: Q = {Qd} m³/dia.{/}2) Multiplicar Q × C: {Qd} × {C} = {g} g/dia "
            "(porque 1 mg/L = 1 g/m³).{/}3) Converter para kg: {g} × 0,001 = {kg} kg/dia."),
    result=S("Carga de {@P} = {kg} kg/dia"),
    guia=dict(
        interpretar="A carga mostra a massa total lançada. Duas correntes com a mesma concentração podem ter "
                    "cargas muito diferentes se as vazões forem diferentes.",
        erro="Usar a vazão em L/s ou m³/h direto na fórmula. Ela precisa estar em m³/dia. A calculadora converte "
             "para você quando você escolhe a unidade.",
        dica="Entenda o 0,001: 1 mg/L é igual a 1 g/m³. Então m³/dia × g/m³ dá g/dia, e multiplicar por 0,001 dá kg/dia."),
    ex_info=[
        ("Carga de DBO de uma indústria",
         "Uma indústria lança 400 m³/dia de efluente com DBO de 180 mg/L. Qual é a carga de DBO?"),
        ("Carga de sólidos com vazão em L/s",
         "Um efluente com vazão de 5 L/s tem 250 mg/L de SST. Qual é a carga diária de sólidos?"),
    ],
)

c2t2 = dict(
    title="Descobrir a concentração", short="Descobrir concentração",
    desc="Calcula a concentração média de um parâmetro quando você conhece a carga diária e a vazão.",
    inputs=[
        lst("P", "Parâmetro", ("DBO", "DQO"), PARAM, "Escolha o parâmetro (serve para identificar o resultado).", show=True),
        num("L", "Carga", "Carga", (24, 150), "kg/dia", "Carga do parâmetro em kg/dia. Ex.: 24"),
        num("Q", "Vazão", "Q", (400, 50), "@uQ", "Vazão da corrente. Ex.: 400"),
        lst("uQ", "Unidade da vazão", ("m³/dia", "m³/h"), VAZAOD_U, "Escolha m³/dia, m³/h ou L/s."),
    ],
    calcs=[("fQ", fator("uQ", VAZAOD_U, VAZAOD_F)), ("Qd", "[Q]*[fQ]"), ("Lg", "[L]*1000"), ("C", "[Lg]/[Qd]"), ("kgm3", "[C]/1000")],
    checks=chk_nn("L", "a carga") + chk_un("fQ", "a vazão") + chk_pos("Q", "a vazão"),
    main=('="CONCENTRAÇÃO DE "&UPPER([P])', "C", "mg/L", FMT_POS),
    sec=[("Mesmo valor em g/m³", "C", "g/m³", FMT_POS), ("Em kg/m³", "kgm3", "kg/m³", FMT_POS),
         ("Vazão usada", "Qd", "m³/dia", FMT_POS)],
    interp=S("Cada litro do efluente carrega, em média, {C} mg de {@P}. É o mesmo que {C} g em cada m³."),
    entenda=entenda_padrao(
        "C (mg/L) = Carga (kg/dia) × 1000 ÷ Q (m³/dia)",
        "C = concentração   |   Carga = massa por dia   |   Q = vazão em m³/dia   |   1000 = converte kg em g",
        S("C = {L} kg/dia × 1000 ÷ {Qd} m³/dia = {C} mg/L"),
        S("C = {C} mg/L")),
    resol=S("1) Vazão em m³/dia: Q = {Qd} m³/dia.{/}2) Carga em g/dia: {L} × 1000 = {Lg} g/dia."
            "{/}3) Dividir pela vazão: C = {Lg} ÷ {Qd} = {C} mg/L."),
    result=S("C = {C} mg/L de {@P}"),
    guia=dict(
        interpretar="A concentração diz o quanto cada litro está carregado. Compare com o padrão de lançamento "
                    "aplicável ao seu caso.",
        erro="Esquecer o fator 1000. Sem ele a resposta sai mil vezes menor (em kg/m³).",
        dica="Use esta ferramenta para conferir se uma carga informada em relatório é coerente com a vazão e a "
             "concentração medidas."),
    ex_info=[
        ("Concentração de DBO na saída",
         "Um efluente tratado sai com carga de 24 kg/dia de DBO e vazão de 400 m³/dia. Qual é a concentração de DBO?"),
        ("DQO de uma lavanderia",
         "Uma lavanderia gera 150 kg/dia de DQO com vazão de 50 m³/h. Qual é a concentração média de DQO?"),
    ],
)

c2t3 = dict(
    title="Descobrir a vazão", short="Descobrir vazão",
    desc="Calcula a vazão que transporta uma carga conhecida com uma concentração conhecida.",
    inputs=[
        lst("P", "Parâmetro", ("DBO", "Fósforo total"), PARAM, "Escolha o parâmetro (serve para identificar o resultado).", show=True),
        num("L", "Carga", "Carga", (72, 6), "kg/dia", "Carga do parâmetro em kg/dia. Ex.: 72"),
        num("C", "Concentração", "C", (180, 8), "mg/L", "Concentração do parâmetro em mg/L. Ex.: 180"),
    ],
    calcs=[("Lg", "[L]*1000"), ("Qd", "[Lg]/[C]"), ("Qh", "[Qd]/24"), ("Qls", "[Qd]/86.4")],
    checks=chk_nn("L", "a carga") + chk_pos("C", "a concentração"),
    main=("VAZÃO", "Qd", "m³/dia", FMT_POS),
    sec=[("Vazão em m³/h", "Qh", "m³/h", FMT_POS), ("Vazão em L/s", "Qls", "L/s", FMT_POS)],
    interp=S("Significado físico: para levar {L} kg/dia de {@P} com {C} mg/L, precisam passar {Qd} m³ de "
             "líquido por dia, cerca de {Qls} litros a cada segundo."),
    entenda=entenda_padrao(
        "Q (m³/dia) = Carga (kg/dia) × 1000 ÷ C (mg/L)",
        "Q = vazão   |   Carga = massa por dia   |   C = concentração   |   1000 = converte kg em g",
        S("Q = {L} kg/dia × 1000 ÷ {C} mg/L = {Qd} m³/dia"),
        S("Q = {Qd} m³/dia = {Qh} m³/h = {Qls} L/s")),
    resol=S("1) Carga em g/dia: {L} × 1000 = {Lg} g/dia.{/}2) Dividir pela concentração (g/m³): "
            "{Lg} ÷ {C} = {Qd} m³/dia.{/}3) Em L/s: {Qd} ÷ 86,4 = {Qls} L/s."),
    result=S("Q = {Qd} m³/dia = {Qls} L/s"),
    guia=dict(
        interpretar="O resultado é a vazão que fecha a conta entre massa e concentração. Se ela for muito diferente "
                    "da vazão medida, algum dado está inconsistente.",
        erro="Inverter a fórmula e dividir a concentração pela carga.",
        dica="Esse cálculo ajuda a estimar a vazão quando só a carga e a concentração são conhecidas."),
    ex_info=[
        ("Vazão coerente com um relatório",
         "Uma amostra indica DBO de 180 mg/L e o relatório informa carga de 72 kg/dia. Qual vazão é coerente com esses dados?"),
        ("Vazão a partir da carga de fósforo",
         "Um efluente leva 6 kg/dia de fósforo total com concentração de 8 mg/L. Qual é a vazão?"),
    ],
)

# =================================================================== CALC 03
_interp_ef = lambda ref, extra: (
    'IF([E]>0,' + S("Houve redução de {@P}: o sistema removeu {E}% " + ref + ".") +
    ',IF([E]=0,' + S("Não houve redução: o valor de saída é igual ao de entrada.") +
    ',' + S("Houve aumento de {@P}: a saída ficou {negE}% acima da entrada. Confira os dados e o "
            "funcionamento do sistema.") + '))' + extra)

c3t1 = dict(
    title="Eficiência por concentração", short="Eficiência por concentração",
    desc="Calcula a porcentagem de redução entre a concentração de entrada e a de saída de um sistema de tratamento.",
    inputs=[
        lst("P", "Parâmetro", ("DBO", "DQO"), PARAM, "Escolha o parâmetro avaliado.", show=True),
        num("Ce", "Concentração de entrada", "Ce", (250, 600), "mg/L", "Concentração antes do tratamento. Ex.: 250"),
        num("Cs", "Concentração de saída", "Cs", (50, 180), "mg/L", "Concentração depois do tratamento. Ex.: 50"),
    ],
    calcs=[("dif", "[Ce]-[Cs]"), ("E", "[dif]/[Ce]*100"), ("Efr", "[dif]/[Ce]"), ("negE", "-[E]"),
           ("rem", "[Cs]/[Ce]*100")],
    checks=chk_pos("Ce", "a concentração de entrada") + chk_nn("Cs", "a concentração de saída"),
    main=("EFICIÊNCIA DE REMOÇÃO", "E", "%", FMT_PCT),
    sec=[("Diferença (entrada − saída)", "dif", "mg/L", FMT_SIG), ("Parcela que permanece", "rem", "%", FMT_PCT)],
    interp=_interp_ef("da concentração de entrada", ""),
    entenda=entenda_padrao(
        "Eficiência (%) = (Ce − Cs) ÷ Ce × 100",
        "Ce = concentração de entrada   |   Cs = concentração de saída   |   a divisão é sempre pela entrada",
        S("E = ({Ce} − {Cs}) ÷ {Ce} × 100 = {dif} ÷ {Ce} × 100 = {E}%"),
        S("Eficiência = {E}%   |   Diferença = {dif} mg/L")),
    resol=S("1) Diferença: {Ce} − {Cs} = {dif} mg/L.{/}2) Dividir pela entrada: {dif} ÷ {Ce} = {Efr}.{/}"
            "3) Multiplicar por 100: E = {E}%."),
    result=S("Eficiência = {E}%"),
    chart=dict(title="Concentração antes e depois", ytitle="mg/L",
               items=[("Entrada", "Ce", "mg/L"), ("Saída", "Cs", "mg/L")], colors=["C55A11", "548235"]),
    guia=dict(
        interpretar="80% de eficiência significa que, de cada 100 mg que entram, 80 mg são removidos e 20 mg saem.",
        erro="Dividir pela concentração de saída. A divisão é sempre pela concentração de entrada.",
        dica="Se as vazões de entrada e saída forem diferentes (perdas, evaporação, retirada de lodo), use a "
             "Ferramenta 2, que trabalha com carga.",
        atencao="A calculadora não classifica o resultado como bom ou ruim e não verifica normas. Para isso, "
                "compare com o padrão aplicável ao parâmetro e ao seu caso."),
    ex_info=[
        ("Eficiência de uma ETE em DBO",
         "Uma ETE recebe esgoto com DBO de 250 mg/L e o efluente tratado sai com 50 mg/L. Qual é a eficiência de remoção?"),
        ("Reator anaeróbio em DQO",
         "Um reator anaeróbio recebe DQO de 600 mg/L e libera 180 mg/L. Qual é a eficiência?"),
    ],
)

c3t2 = dict(
    title="Eficiência por carga", short="Eficiência por carga",
    desc="Calcula a remoção de massa poluidora. Use quando as vazões de entrada e de saída forem diferentes.",
    inputs=[
        lst("P", "Parâmetro", ("DBO", "SST"), PARAM, "Escolha o parâmetro avaliado.", show=True),
        num("Qe", "Vazão de entrada", "Qe", (500, 1000), "m³/dia", "Vazão que entra no sistema. Ex.: 500"),
        num("Ce", "Concentração de entrada", "Ce", (200, 300), "mg/L", "Concentração na entrada. Ex.: 200"),
        num("Qs", "Vazão de saída", "Qs", (400, 950), "m³/dia", "Vazão do efluente final. Ex.: 400"),
        num("Cs", "Concentração de saída", "Cs", (50, 30), "mg/L", "Concentração no efluente final. Ex.: 50"),
    ],
    calcs=[("Le", "[Qe]*[Ce]*0.001"), ("Ls", "[Qs]*[Cs]*0.001"), ("Lr", "[Le]-[Ls]"),
           ("E", "[Lr]/[Le]*100"), ("negE", "-[E]"), ("Ec", "([Ce]-[Cs])/[Ce]*100")],
    checks=chk_pos("Qe", "a vazão de entrada") + chk_pos("Ce", "a concentração de entrada") +
    chk_nn("Qs", "a vazão de saída") + chk_nn("Cs", "a concentração de saída"),
    main=("EFICIÊNCIA POR CARGA", "E", "%", FMT_PCT),
    sec=[("Carga de entrada", "Le", "kg/dia", FMT_POS), ("Carga de saída", "Ls", "kg/dia", FMT_POS),
         ("Carga removida", "Lr", "kg/dia", FMT_SIG), ("Eficiência por concentração", "Ec", "%", FMT_PCT)],
    interp=_interp_ef("da carga de entrada", '&' + S(" Só pelas concentrações, a eficiência seria {Ec}%.")),
    entenda=[
        ("Fórmula", "formula", "Carga = Q × C × 0,001     |     Eficiência (%) = (Carga entrada − Carga saída) ÷ Carga entrada × 100"),
        ("O que é cada variável", "static", "Qe, Ce = vazão (m³/dia) e concentração (mg/L) de entrada   |   Qs, Cs = vazão e "
                                            "concentração de saída   |   Carga em kg/dia"),
        ("Valores inseridos", "live", None),
        ("Substituição", "dyn", S("Carga entrada = {Qe} × {Ce} × 0,001 = {Le} kg/dia{/}Carga saída = {Qs} × {Cs} × 0,001 = "
                                  "{Ls} kg/dia{/}E = ({Le} − {Ls}) ÷ {Le} × 100 = {E}%")),
        ("Resultado", "dyn", S("Carga de entrada = {Le} kg/dia   |   Carga de saída = {Ls} kg/dia   |   Eficiência = {E}%")),
    ],
    resol=S("1) Carga de entrada: {Qe} × {Ce} × 0,001 = {Le} kg/dia.{/}2) Carga de saída: {Qs} × {Cs} × 0,001 = "
            "{Ls} kg/dia.{/}3) Eficiência: ({Le} − {Ls}) ÷ {Le} × 100 = {E}%."),
    result=S("Carga de entrada = {Le} kg/dia   |   Carga de saída = {Ls} kg/dia   |   Eficiência = {E}%"),
    chart=dict(title="Carga poluidora de entrada e saída", ytitle="kg/dia",
               items=[("Carga de entrada", "Le", "kg/dia"), ("Carga de saída", "Ls", "kg/dia")],
               colors=["C55A11", "548235"]),
    guia=dict(
        interpretar="A eficiência por carga mostra quanto da massa de poluente foi realmente retida ou transformada "
                    "no sistema, mesmo quando a vazão muda entre a entrada e a saída.",
        erro="Calcular a eficiência só pelas concentrações quando as vazões mudam. Nesse caso o resultado pode enganar.",
        dica="Compare as duas eficiências (por carga e por concentração) para entender o efeito da mudança de vazão.",
        atencao="A calculadora não classifica o resultado como bom ou ruim e não verifica normas. Para isso, "
                "compare com o padrão aplicável ao parâmetro e ao seu caso."),
    ex_info=[
        ("ETE com perda de vazão",
         "Uma ETE recebe 500 m³/dia com 200 mg/L de DBO. Parte da água sai com o lodo, e o efluente final tem "
         "400 m³/dia com 50 mg/L."),
        ("Decantador avaliado por carga",
         "Um decantador recebe 1.000 m³/dia com 300 mg/L de SST. O clarificado sai com 950 m³/dia e 30 mg/L."),
    ],
)

# =================================================================== CALC 04
c4t1 = dict(
    title="Mistura de duas correntes", short="Mistura de duas correntes",
    desc="Calcula a vazão total e a concentração final quando duas correntes se juntam. Considera mistura "
         "completa, sem perdas e sem transformação do constituinte.",
    inputs=[
        num("Q1", "Vazão da corrente 1", "Q₁", (120, 432), "m³/dia", "Vazão da primeira corrente. Ex.: 120"),
        num("C1", "Concentração da corrente 1", "C₁", (200, 60), "mg/L", "Concentração da primeira corrente. Ex.: 200"),
        num("Q2", "Vazão da corrente 2", "Q₂", (80, 8640), "m³/dia", "Vazão da segunda corrente. Ex.: 80"),
        num("C2", "Concentração da corrente 2", "C₂", (50, 2), "mg/L", "Concentração da segunda corrente. Ex.: 50"),
    ],
    calcs=[("Qt", "[Q1]+[Q2]"), ("QC", "[Q1]*[C1]+[Q2]*[C2]"), ("Cf", "[QC]/[Qt]"),
           ("L1", "[Q1]*[C1]*0.001"), ("L2", "[Q2]*[C2]*0.001"), ("Lt", "[L1]+[L2]"),
           ("Cmin", "MIN([C1],[C2])"), ("Cmax", "MAX([C1],[C2])")],
    checks=chk_pos("Q1", "a vazão da corrente 1") + chk_nn("C1", "a concentração da corrente 1") +
    chk_pos("Q2", "a vazão da corrente 2") + chk_nn("C2", "a concentração da corrente 2"),
    main=("CONCENTRAÇÃO FINAL DA MISTURA", "Cf", "mg/L", FMT_POS),
    sec=[("Vazão total", "Qt", "m³/dia", FMT_POS), ("Carga da corrente 1", "L1", "kg/dia", FMT_POS),
         ("Carga da corrente 2", "L2", "kg/dia", FMT_POS), ("Carga total", "Lt", "kg/dia", FMT_POS)],
    interp='IF([C1]=[C2],' + S("As duas correntes têm a mesma concentração, então a mistura também fica com {Cf} mg/L.") +
    ',' + S("A mistura fica com {Cf} mg/L. O valor está entre {Cmin} e {Cmax} mg/L e fica mais perto da corrente de "
            "maior vazão, porque a média é ponderada pelas vazões.") + ')' +
    '&' + S(" A carga total ({Lt} kg/dia) é a soma das cargas das duas correntes."),
    entenda=entenda_padrao(
        "Cfinal = (Q₁ × C₁ + Q₂ × C₂) ÷ (Q₁ + Q₂)",
        "Q₁, Q₂ = vazões das correntes   |   C₁, C₂ = concentrações   |   Cfinal = concentração da mistura.   "
        "Hipóteses: mistura completa, sem perdas e sem reação.",
        S("Cfinal = ({Q1} × {C1} + {Q2} × {C2}) ÷ ({Q1} + {Q2}) = {QC} ÷ {Qt} = {Cf} mg/L"),
        S("Vazão total = {Qt} m³/dia   |   Cfinal = {Cf} mg/L   |   Carga total = {Lt} kg/dia")),
    resol=S("1) Vazão total: {Q1} + {Q2} = {Qt} m³/dia.{/}2) Soma de Q × C: {Q1} × {C1} + {Q2} × {C2} = {QC}.{/}"
            "3) Cfinal = {QC} ÷ {Qt} = {Cf} mg/L."),
    result=S("Vazão total = {Qt} m³/dia   |   Cfinal = {Cf} mg/L"),
    chart=dict(title="Concentração das correntes e da mistura", ytitle="mg/L",
               items=[("Corrente 1", "C1", "mg/L"), ("Corrente 2", "C2", "mg/L"), ("Mistura", "Cf", "mg/L")],
               colors=["2E75B6", "00808C", "2E7D32"]),
    guia=dict(
        interpretar="A concentração final é uma média ponderada: a corrente com mais vazão puxa o resultado para "
                    "perto dela.",
        erro="Fazer a média simples das concentrações ((200 + 50) ÷ 2 = 125 mg/L). A média precisa ser ponderada "
             "pelas vazões.",
        dica="A concentração final funciona com qualquer unidade de vazão, desde que as duas correntes usem a mesma. "
             "As cargas em kg/dia assumem m³/dia e mg/L."),
    ex_info=[
        ("Junção de duas linhas de efluente",
         "Duas linhas de efluente se juntam antes do tratamento: 120 m³/dia com 200 mg/L de DBO e 80 m³/dia com 50 mg/L."),
        ("Lançamento de efluente em um rio",
         "Um efluente tratado (432 m³/dia, DBO de 60 mg/L) é lançado em um rio com vazão de 8.640 m³/dia e DBO de "
         "2 mg/L. Qual é a DBO logo após a mistura?"),
    ],
)

c4t2 = dict(
    title="Balanço de massa em decantadores", short="Balanço em decantadores",
    desc="Calcula a concentração de sólidos no lodo a partir da entrada e do clarificado e confere se o balanço "
         "hidráulico fecha (Qe = Qa + Ql).",
    inputs=[
        num("Qe", "Vazão de entrada (Qe)", "Qe", (500, 1000), "m³/dia", "Vazão que entra no decantador. Ex.: 500"),
        num("Ce", "Concentração de entrada (Ce)", "Ce", (180, 220), "mg/L", "Sólidos na entrada. Ex.: 180"),
        num("Qa", "Vazão do clarificado (Qa)", "Qa", (490, 985), "m³/dia", "Vazão que sai por cima. Ex.: 490"),
        num("Ca", "Concentração do clarificado (Ca)", "Ca", (30, 25), "mg/L", "Sólidos no clarificado. Ex.: 30"),
        num("Ql", "Vazão de lodo (Ql)", "Ql", (10, 15), "m³/dia", "Vazão de lodo retirada pelo fundo. Ex.: 10"),
    ],
    calcs=[("QeCe", "[Qe]*[Ce]"), ("QaCa", "[Qa]*[Ca]"), ("Cl", "([QeCe]-[QaCa])/[Ql]"),
           ("Le", "[QeCe]*0.001"), ("La", "[QaCa]*0.001"), ("Ll", "[Le]-[La]"),
           ("QaQl", "[Qa]+[Ql]"), ("dQ", "[Qe]-[QaQl]"), ("fecha", "ABS([dQ])<=0.005*[Qe]"),
           ("fecha_txt", 'IF([fecha],"✔ Fecha","⚠ Não fecha")'), ("razao", "ROUND([Cl]/[Ce],1)")],
    checks=chk_pos("Qe", "a vazão de entrada (Qe)") + chk_nn("Ce", "a concentração de entrada (Ce)") +
    chk_nn("Qa", "a vazão do clarificado (Qa)") + chk_nn("Ca", "a concentração do clarificado (Ca)") +
    chk_pos("Ql", "a vazão de lodo (Ql)"),
    main=("CONCENTRAÇÃO NO LODO (Cl)", "Cl", "mg/L", FMT_SIG),
    sec=[("Carga de entrada", "Le", "kg/dia", FMT_POS), ("Carga no clarificado", "La", "kg/dia", FMT_POS),
         ("Carga no lodo", "Ll", "kg/dia", FMT_SIG), ("Balanço hidráulico", "=fecha_txt", "", "General")],
    interp='IF([Cl]<0,' + S("O resultado é negativo: pelos dados, o clarificado leva mais sólidos do que entram no "
                            "decantador. Isso não acontece na prática, então confira vazões e concentrações.") +
    ',' + S("O lodo sai com {Cl} mg/L de sólidos.") + '&IF(ISNUMBER([razao]),' +
    S(" É cerca de {razao} vezes a concentração de entrada.") + ',""))&" "&IF([fecha],' +
    S("Balanço hidráulico fechado: Qe = Qa + Ql = {Qe} m³/dia.") + ',' +
    S("Atenção: Qe ({Qe}) é diferente de Qa + Ql ({QaQl}). Diferença de {dQ} m³/dia. Confira as vazões.") + ')',
    entenda=entenda_padrao(
        "Qe × Ce = Qa × Ca + Ql × Cl     →     Cl = (Qe × Ce − Qa × Ca) ÷ Ql",
        "Qe, Ce = entrada   |   Qa, Ca = clarificado (saída superior)   |   Ql, Cl = lodo (saída inferior)",
        S("Cl = ({Qe} × {Ce} − {Qa} × {Ca}) ÷ {Ql} = ({QeCe} − {QaCa}) ÷ {Ql} = {Cl} mg/L"),
        S("Cl = {Cl} mg/L   |   Carga no lodo = {Ll} kg/dia   |   Qa + Ql = {QaQl} m³/dia")),
    resol=S("1) Massa que entra: Qe × Ce = {Qe} × {Ce} = {QeCe} g/dia.{/}2) Massa no clarificado: Qa × Ca = {Qa} × "
            "{Ca} = {QaCa} g/dia.{/}3) Massa no lodo = {QeCe} − {QaCa}; Cl = essa massa ÷ Ql = {Cl} mg/L."),
    result=S("Cl = {Cl} mg/L   |   Balanço hidráulico: Qa + Ql = {QaQl} m³/dia"),
    chart=dict(title="Carga de sólidos em cada corrente", ytitle="kg/dia",
               items=[("Entrada", "Le", "kg/dia"), ("Clarificado", "La", "kg/dia"), ("Lodo", "Ll", "kg/dia")],
               colors=["C55A11", "2E75B6", "7F6000"]),
    guia=dict(
        interpretar="A massa de sólidos se conserva, mas a vazão se divide. Como o lodo tem vazão pequena, ele fica "
                    "muito concentrado.",
        erro="Esquecer de conferir as vazões. Se Qe for diferente de Qa + Ql, o balanço de massa também fica errado.",
        dica="Confira sempre o balanço hidráulico antes do balanço de massa. A linha Balanço hidráulico faz isso por você."),
    ex_info=[
        ("Decantador primário",
         "Um decantador primário recebe 500 m³/dia com 180 mg/L de SST. O clarificado sai com 490 m³/dia e 30 mg/L, "
         "e o lodo é retirado a 10 m³/dia."),
        ("Decantador secundário",
         "Um decantador secundário recebe 1.000 m³/dia com 220 mg/L de sólidos. Saem 985 m³/dia de clarificado com "
         "25 mg/L e 15 m³/dia de lodo."),
    ],
)

c4t3 = dict(
    title="Acúmulo de massa", short="Acúmulo de massa",
    desc="Aplica a equação geral do balanço de massa para saber se o constituinte está acumulando, diminuindo ou "
         "estável dentro do sistema. Todos os termos precisam estar na mesma unidade de massa por tempo.",
    inputs=[
        lst("uM", "Unidade dos termos", ("kg/dia", "kg/dia"), MASSA_U,
            "Todos os termos abaixo devem estar nesta mesma unidade."),
        num("E", "Entrada", "Entrada", (100, 50), "@uM", "Massa que entra por unidade de tempo. Ex.: 100"),
        num("Sd", "Saída", "Saída", (20, 10), "@uM", "Massa que sai por unidade de tempo. Ex.: 20"),
        num("G", "Geração interna", "Geração", (0, 0), "@uM", "Massa produzida dentro do sistema. Digite 0 se não houver."),
        num("Cn", "Consumo ou transformação", "Consumo", (0, 45), "@uM", "Massa consumida ou degradada. Digite 0 se não houver."),
    ],
    calcs=[("A", "[E]-[Sd]+[G]-[Cn]"), ("negA", "-[A]"), ("tin", "[E]+[G]"), ("tout", "[Sd]+[Cn]")],
    checks=[('[uM]=""', "Escolha a unidade dos termos.")] + chk_nn("E", "a entrada") + chk_nn("Sd", "a saída") +
    chk_nn("G", "a geração interna") + chk_nn("Cn", "o consumo"),
    main=("TAXA DE ACÚMULO DE MASSA", "A", "@uM", FMT_SIG),
    sec=[("Entrada + geração", "tin", "@uM", FMT_POS), ("Saída + consumo", "tout", "@uM", FMT_POS)],
    interp='IF([A]>0,' + S("Acúmulo positivo: a massa dentro do sistema aumenta {A} {@uM}. O constituinte está se "
                           "acumulando (por exemplo, lodo no fundo de um tanque).") +
    ',IF([A]=0,' + S("Acúmulo nulo: o que entra e é gerado é igual ao que sai e é consumido. O sistema está em regime "
                     "permanente.") +
    ',' + S("Acúmulo negativo: a massa dentro do sistema diminui {negA} {@uM}. O sistema está perdendo o "
            "constituinte ao longo do tempo.") + '))',
    entenda=entenda_padrao(
        "Acúmulo = Entrada − Saída + Geração − Consumo",
        "Todos os termos são taxas de massa por tempo e precisam estar na MESMA unidade (escolhida em Unidade dos termos).",
        S("Acúmulo = {E} − {Sd} + {G} − {Cn} = {A} {@uM}"),
        S("Acúmulo = {A} {@uM}")),
    resol=S("1) Somar o que aumenta a massa: Entrada + Geração = {E} + {G} = {tin}.{/}2) Somar o que diminui: Saída + "
            "Consumo = {Sd} + {Cn} = {tout}.{/}3) Acúmulo = {tin} − {tout} = {A} {@uM}."),
    result=S("Acúmulo = {A} {@uM}"),
    chart=dict(title="Termos do balanço de massa", ytitle="massa/tempo",
               items=[("Entrada", "E", "@uM"), ("Saída", "Sd", "@uM"), ("Geração", "G", "@uM"),
                      ("Consumo", "Cn", "@uM"), ("Acúmulo", "A", "@uM")],
               colors=["2E75B6", "C55A11", "548235", "7F6000", "7030A0"]),
    guia=dict(
        interpretar="Acúmulo positivo: a massa cresce. Zero: está estável. Negativo: a massa diminui.",
        erro="Misturar unidades, como entrada em kg/dia e saída em g/s. Converta todos os termos antes de calcular.",
        dica="Em regime permanente o acúmulo é zero. Muitos exercícios usam isso para descobrir um termo desconhecido."),
    ex_info=[
        ("Acúmulo de lodo em um tanque",
         "Um tanque recebe 100 kg/dia de sólidos e descarta 20 kg/dia. Não há geração nem consumo. Quanto lodo se "
         "acumula por dia?"),
        ("DBO em uma lagoa",
         "Uma lagoa recebe 50 kg/dia de DBO, libera 10 kg/dia no efluente e degrada 45 kg/dia por ação biológica. "
         "O que acontece com a massa de DBO na lagoa?"),
    ],
)

# =================================================================== CALC 05
_modo = f"IFERROR(MATCH([modo],{arr(MODOS)},0),0)"


def _v(var, k, uk):
    return f'IF([m]={k},"? (a calcular)",' + N(var) + f'&" "&[{uk}])'


c5 = dict(
    title="Diluição: C₁ × V₁ = C₂ × V₂", short="Diluição de soluções",
    desc="Escolha o que deseja encontrar. A variável escolhida é calculada e o valor digitado nela é ignorado. "
         "Cada concentração e cada volume tem sua própria unidade.",
    inputs=[
        lst("modo", "O que deseja encontrar?", (MODOS[0], MODOS[1]), MODOS, "Escolha a incógnita do problema."),
        dict(key="C1", label="C₁: concentração do estoque", sym="C₁", ex=(1000, 1), unit="@uC1", kind="num",
             hint="Concentração da solução concentrada. Ex.: 1000", target=4, my=None),
        lst("uC1", "Unidade de C₁", ("mg/L", "g/L"), CONC_U, "Unidade da concentração do estoque."),
        dict(key="V1", label="V₁: volume do estoque", sym="V₁", ex=("—", 5), unit="@uV1", kind="num",
             hint="Volume de estoque que será transferido. Ex.: 100", target=1, my=None),
        lst("uV1", "Unidade de V₁", ("mL", "mL"), VOLLAB_U, "Unidade do volume de estoque."),
        dict(key="C2", label="C₂: concentração final", sym="C₂", ex=(200, "—"), unit="@uC2", kind="num",
             hint="Concentração desejada na solução final. Ex.: 200", target=2, my=None),
        lst("uC2", "Unidade de C₂", ("mg/L", "mg/L"), CONC_U, "Unidade da concentração final."),
        dict(key="V2", label="V₂: volume final", sym="V₂", ex=(500, 250), unit="@uV2", kind="num",
             hint="Volume final da solução (balão). Ex.: 500", target=3, my=None),
        lst("uV2", "Unidade de V₂", ("mL", "mL"), VOLLAB_U, "Unidade do volume final."),
    ],
    mode_expr=_modo,
    calcs=[
        ("m", _modo),
        ("ic1", f"MATCH([uC1],{arr(CONC_U)},0)"), ("fc1", "CHOOSE([ic1],1,1000,0.001,10000,1,0.001)"),
        ("fam1", "CHOOSE([ic1],1,1,1,1,2,2)"),
        ("ic2", f"MATCH([uC2],{arr(CONC_U)},0)"), ("fc2", "CHOOSE([ic2],1,1000,0.001,10000,1,0.001)"),
        ("fam2", "CHOOSE([ic2],1,1,1,1,2,2)"),
        ("fv1", fator("uV1", VOLLAB_U, VOLLAB_F)), ("fv2", fator("uV2", VOLLAB_U, VOLLAB_F)),
        ("c1b", 'IF([m]=4,"",[C1]*[fc1])'), ("v1b", 'IF([m]=1,"",[V1]*[fv1])'),
        ("c2b", 'IF([m]=2,"",[C2]*[fc2])'), ("v2b", 'IF([m]=3,"",[V2]*[fv2])'),
        ("rb", "CHOOSE([m],[c2b]*[v2b]/[c1b],[c1b]*[v1b]/[v2b],[c1b]*[v1b]/[c2b],[c2b]*[v2b]/[v1b])"),
        ("r", "CHOOSE([m],[rb]/[fv1],[rb]/[fc2],[rb]/[fv2],[rb]/[fc1])"),
        ("C1f", "IF([m]=4,[rb],[c1b])"), ("V1f", "IF([m]=1,[rb],[v1b])"),
        ("C2f", "IF([m]=2,[rb],[c2b])"), ("V2f", "IF([m]=3,[rb],[v2b])"),
        ("C1u", "[C1f]/[fc1]"), ("V1u", "[V1f]/[fv1]"), ("C2u", "[C2f]/[fc2]"), ("V2u", "[V2f]/[fv2]"),
        ("solvml", "[V2f]-[V1f]"), ("solv", "[solvml]/[fv2]"), ("fd", "[C1f]/[C2f]"),
        ("bu", 'IF([fam1]=1,"mg/L","mol/L")'),
        ("rlabel", 'CHOOSE([m],"VOLUME DE ESTOQUE (V₁)","CONCENTRAÇÃO FINAL (C₂)","VOLUME FINAL (V₂)",'
                   '"CONCENTRAÇÃO DO ESTOQUE (C₁)")'),
        ("rsym", 'CHOOSE([m],"V₁","C₂","V₂","C₁")'),
        ("runit", "CHOOSE([m],[uV1],[uC2],[uV2],[uC1])"),
    ],
    checks=[('[m]=0', "Escolha na lista o que você deseja encontrar.")] +
    chk_un("fc1", "C₁") + chk_un("fv1", "V₁") + chk_un("fc2", "C₂") + chk_un("fv2", "V₂") +
    [('[fam1]<>[fam2]', "Confira a unidade selecionada: C₁ e C₂ precisam ser do mesmo tipo (massa por volume ou mol "
                        "por volume).")] +
    chk_pos("C1", "a concentração do estoque (C₁)", "[m]=4") + chk_pos("V1", "o volume do estoque (V₁)", "[m]=1") +
    chk_pos("C2", "a concentração final (C₂)", "[m]=2") + chk_pos("V2", "o volume final (V₂)", "[m]=3") +
    [('AND(OR([m]=1,[m]=3),[c2b]>[c1b])', "A concentração desejada é maior que a solução estoque. Em uma diluição "
                                          "simples, C₂ precisa ser menor ou igual a C₁."),
     ('AND(OR([m]=2,[m]=4),[v1b]>[v2b])', "O volume de estoque (V₁) não pode ser maior que o volume final (V₂).")],
    main=('=IF([ok],[rlabel],"RESULTADO")', "r", "=IF([ok],[runit],\"\")", FMT_POS),
    sec=[("Solvente a adicionar", "solv", "@uV2", FMT_POS), ("Fator de diluição", "fd", "vezes", FMT_POS),
         ("Volume de estoque (V₁)", "V1u", "@uV1", FMT_POS), ("Concentração final (C₂)", "C2u", "@uC2", FMT_POS)],
    interp=S("Utilize {V1u} {@uV1} da solução estoque e complete com solvente até atingir o volume final de "
             "{V2u} {@uV2}. A solução final terá concentração de {C2u} {@uC2}.") +
    '&IF([m]=4,' + S(" A solução estoque precisa ter {C1u} {@uC1}.") + ',"")' +
    '&IF(ROUND([fd],9)=1,' + S(" Como C₁ = C₂, não há diluição.") + ',"")',
    values=lit("C₁ = ") + "&" + _v("C1", 4, "uC1") + '&"   |   V₁ = "&' + _v("V1", 1, "uV1") +
    '&"   |   C₂ = "&' + _v("C2", 2, "uC2") + '&"   |   V₂ = "&' + _v("V2", 3, "uV2"),
    subst=('CHOOSE([m],' +
           S("V₁ = C₂ × V₂ ÷ C₁ = {C2f} × {V2f} ÷ {C1f} = {V1f} mL") + ',' +
           S("C₂ = C₁ × V₁ ÷ V₂ = {C1f} × {V1f} ÷ {V2f} = {C2f} {@bu}") + ',' +
           S("V₂ = C₁ × V₁ ÷ C₂ = {C1f} × {V1f} ÷ {C2f} = {V2f} mL") + ',' +
           S("C₁ = C₂ × V₂ ÷ V₁ = {C2f} × {V2f} ÷ {V1f} = {C1f} {@bu}") + ')' +
           '&' + S("{/}(concentrações em {@bu} e volumes em mL)   →   {@rsym} = {r} {@runit}")),
    result=S("{@rsym} = {r} {@runit}   |   Solvente a adicionar = {solv} {@uV2}"),
    chart=dict(title="Composição da solução final (mL)", ytitle="mL",
               items=[("Solução estoque", "V1f", "mL"), ("Solvente", "solvml", "mL")],
               colors=["00808C", "9DC3E6"]),
    guia=dict(
        interpretar="V₁ é o quanto você retira do frasco de estoque. Depois, complete com solvente até a marca do "
                    "volume final.",
        erro="Usar volumes em unidades diferentes sem converter, ou pedir uma concentração final maior que a do "
             "estoque. Diluir sempre reduz a concentração.",
        dica="Use vidraria volumétrica (pipeta e balão volumétrico) para ter precisão. O volume de solvente é V₂ − V₁."),
    ex_info=[
        ("Preparo de solução a partir de padrão",
         "No laboratório há uma solução padrão de 1.000 mg/L. Você precisa preparar 500 mL de uma solução com "
         "200 mg/L. Quanto da solução padrão deve usar?"),
        ("Concentração após diluição em balão",
         "Foram transferidos 5 mL de uma solução de 1 g/L para um balão de 250 mL, completado com água destilada. "
         "Qual é a concentração final em mg/L?"),
    ],
)
c5["esquema"] = [
    ("① SOLUÇÃO ESTOQUE  ➜", S("Frasco com C₁ = {C1u} {@uC1}")),
    ("② TRANSFERÊNCIA  ➜", S("Retire {V1u} {@uV1} da solução estoque com pipeta volumétrica")),
    ("③ DILUIÇÃO  ➜", S("Coloque no balão e complete com cerca de {solv} {@uV2} de solvente até a marca")),
    ("④ SOLUÇÃO FINAL", S("{V2u} {@uV2} de solução com C₂ = {C2u} {@uC2}")),
]
c5["entenda"] = [
    ("Fórmula", "formula", "C₁ × V₁ = C₂ × V₂"),
    ("O que é cada variável", "static", "C₁ = concentração do estoque   |   V₁ = volume de estoque transferido   |   "
                                         "C₂ = concentração desejada   |   V₂ = volume final"),
    ("Valores inseridos", "live", None),
    ("Substituição", "dyn", c5["subst"]),
    ("Resultado", "dyn", c5["result"]),
]
c5["resol"] = (S("1) Isolar a incógnita em C₁ × V₁ = C₂ × V₂ e converter para unidades base.{/}2) ") + "&" +
               c5["subst"] + "&" + S("{/}3) Solvente a adicionar = V₂ − V₁ = {V2f} − {V1f} = {solvml} mL."))

# =================================================================== CALC 06
c6 = dict(
    title="Dosagem: 3 ferramentas em sequência", short="Dosagem química",
    desc="Ferramenta 1 calcula a massa de componente ativo. Ferramenta 2 converte em massa de produto comercial. "
         "Ferramenta 3 converte em volume de produto líquido (quando houver densidade).",
    inputs=[
        dict(key="prod", label="Produto (opcional)", sym="Produto", ex=("Coagulante líquido", "Hipoclorito de sódio"),
             unit="texto", kind="text", hint="Nome do produto, só para identificação.", my=None),
        num("Q", "Vazão tratada", "Q", (500, 25), "@uQ", "Vazão de água ou efluente que recebe o produto. Ex.: 500"),
        lst("uQ", "Unidade da vazão", ("m³/dia", "L/s"), VAZAOD_U, "Escolha m³/dia, m³/h ou L/s."),
        num("D", "Dosagem de componente ativo", "D", (4, 2), "mg/L", "Dose de ATIVO desejada, em mg/L. Ex.: 4"),
        num("pct", "Componente ativo no produto", "Ativo", (50, 12), "%", "Porcentagem de ativo no produto comercial. "
                                                                          "Para 50%, digite 50.", kind="pct"),
        num("dens", "Densidade do produto", "ρ", (1.2, 1.2), "kg/L", "Somente para produto líquido. Deixe em branco "
                                                                    "se for sólido. Ex.: 1,2", kind="dens"),
    ],
    calcs=[("fQ", fator("uQ", VAZAOD_U, VAZAOD_F)), ("Qd", "[Q]*[fQ]"), ("frac", "[pct]/100"),
           ("ma", "[Qd]*[D]*0.001"), ("mc", "[ma]/[frac]"), ("vol", 'IF([dens]="","",[mc]/[dens])'),
           ("Dc", "[D]/[frac]"), ("mcm", "[mc]*30"), ("vol_txt", 'IF([dens]="","sem densidade",[vol])')],
    checks=chk_pos("Q", "a vazão") + chk_un("fQ", "a vazão") + chk_pos("D", "a dosagem ativa") + [
        ('[pct]=""', "Confira a porcentagem do componente ativo: o campo está vazio."),
        ("NOT(ISNUMBER([pct]))", "Confira a porcentagem do componente ativo: digite um número de 0 a 100."),
        ("[pct]<=0", "Confira a porcentagem do componente ativo: ela precisa ser maior que zero."),
        ("[pct]>100", "Confira a porcentagem do componente ativo: o valor não pode passar de 100%."),
        ('AND([dens]<>"",NOT(ISNUMBER([dens])))', "A densidade precisa ser um número. Deixe em branco se o produto for sólido."),
        ("AND(ISNUMBER([dens]),[dens]<=0)", "A densidade deve ser maior que zero. Deixe em branco se o produto for sólido."),
    ],
    main=("FERRAMENTA 2 · MASSA DE PRODUTO COMERCIAL", "mc", "kg/dia", FMT_POS),
    sec=[("Ferramenta 1 · Massa de ativo", "ma", "kg/dia", FMT_POS),
         ("Ferramenta 3 · Volume de produto", "=vol_txt", "L/dia", FMT_POS),
         ("Dose em produto comercial", "Dc", "mg/L", FMT_POS), ("Consumo mensal (30 dias)", "mcm", "kg/mês", FMT_POS)],
    interp=S("Para dosar {D} mg/L de componente ativo em {Qd} m³/dia são necessários {ma} kg/dia de ativo, que "
             "correspondem a {mc} kg/dia do produto comercial") +
    '&IF([dens]="",' + S(". Para converter em volume, informe a densidade (somente produto líquido).") +
    ',' + S(", ou cerca de {vol} L/dia de produto líquido.") + ')' +
    '&IF([pct]<1,' + S(" Atenção: você informou {pct}% de ativo. Se o produto tem 50%, digite 50 (e não 0,5).") + ',"")' +
    '&IF(AND(ISNUMBER([dens]),OR([dens]<0.8,[dens]>2)),' +
    S(" Confira a densidade: o valor está fora da faixa comum de produtos líquidos (0,8 a 2,0 kg/L).") + ',"")',
    entenda=[
        ("Ferramenta 1", "formula", "Massa ativa (kg/dia) = Q (m³/dia) × D (mg/L) × 0,001"),
        ("Substituição F1", "dyn", S("Massa ativa = {Qd} × {D} × 0,001 = {ma} kg/dia")),
        ("Ferramenta 2", "formula", "Massa comercial = Massa ativa ÷ Fração ativa     (50% = 0,50)"),
        ("Substituição F2", "dyn", S("Fração ativa = {pct} ÷ 100 = {frac}   →   Massa comercial = {ma} ÷ {frac} = {mc} kg/dia")),
        ("Ferramenta 3", "formula", "Volume (L/dia) = Massa comercial (kg/dia) ÷ Densidade (kg/L)"),
        ("Substituição F3", "dyn", 'IF([dens]="",' + S("Sem densidade informada: etapa não aplicável (produto sólido ou "
                                                       "densidade desconhecida).") +
         ',' + S("Volume = {mc} ÷ {dens} = {vol} L/dia") + ')'),
        ("O que é cada variável", "static", "Q = vazão tratada   |   D = dosagem de componente ATIVO   |   Fração ativa = "
                                             "porcentagem ÷ 100   |   Densidade = massa de 1 litro do produto"),
        ("Valores inseridos", "live", None),
    ],
    resol=S("1) Massa ativa = {Qd} m³/dia × {D} mg/L × 0,001 = {ma} kg/dia.{/}2) Massa comercial = {ma} ÷ {frac} = "
            "{mc} kg/dia.{/}3) Volume = {mc} ÷ {dens} = {vol} L/dia."),
    result=S("Ativo = {ma} kg/dia   |   Produto comercial = {mc} kg/dia   |   Volume ≈ {vol} L/dia"),
    chart=dict(title="Massa necessária por dia", ytitle="kg/dia",
               items=[("Componente ativo", "ma", "kg/dia"), ("Produto comercial", "mc", "kg/dia")],
               colors=["B8860B", "2E7D32"]),
    guia=dict(
        interpretar="A dosagem é definida em componente ativo. Como o produto comercial tem só uma parte de ativo, "
                    "a massa de produto é sempre maior que a massa de ativo.",
        erro="Usar a porcentagem como número inteiro na fórmula (dividir por 50 em vez de 0,50) ou confundir dosagem "
             "de ativo com dosagem de produto comercial.",
        dica="Não assuma densidade de 1 kg/L. Consulte a ficha técnica (FDS/FISPQ) do produto.",
        atencao="Valores teóricos de apoio. A aplicação operacional exige considerar especificações do fabricante, "
                "compatibilidade, segurança e critérios técnicos."),
    ex_info=[
        ("Dosagem de coagulante líquido",
         "Uma ETA trata 500 m³/dia e precisa aplicar 4 mg/L de componente ativo. O produto comercial tem 50% de "
         "ativo e densidade de 1,2 kg/L."),
        ("Desinfecção com hipoclorito de sódio",
         "Uma estação desinfeta 25 L/s de água com 2 mg/L de cloro ativo, usando hipoclorito de sódio com 12% de "
         "cloro ativo e densidade de 1,20 kg/L."),
    ],
)

# =================================================================== CALCULADORAS
CALCS = [
    dict(n=1, curto="Vazão e Hidráulica", nome="Vazão e Hidráulica", emoji="💧", tools=[c1t1, c1t2, c1t3, c1t4],
         card="Calcule vazão por volume e tempo, vazão em tubulações, velocidade do escoamento e tempo de detenção "
              "hidráulica, com conversão automática de unidades.",
         card2="4 ferramentas · m³/s, L/s, m³/h, m³/dia",
         what="Vazão (volume por tempo), área da seção de tubos, velocidade do escoamento e tempo de detenção hidráulica (TDH).",
         when="Conferência de tubulações, bombas, tanques, reservatórios, lagoas e unidades de tratamento. Útil em "
              "Hidráulica, Saneamento e Tratamento de Água e Esgoto.",
         example="Descobrir a vazão de uma bomba que enche um tanque de 360 m³ em 2 horas, ou quanto tempo o esgoto "
                 "fica em um tanque de equalização."),
    dict(n=2, curto="Carga Poluidora", nome="Carga Poluidora", emoji="🏭", tools=[c2t1, c2t2, c2t3],
         card="Descubra quantos kg por dia de DBO, DQO, SST, nitrogênio ou fósforo uma corrente transporta. Também "
              "calcula a concentração ou a vazão a partir da carga.",
         card2="3 ferramentas · kg/dia, mg/L, m³/dia",
         what="A massa de poluente que uma corrente leva por dia (carga), a partir da vazão e da concentração. "
              "Também faz o caminho inverso.",
         when="Caracterização de efluentes, estudos de impacto em rios, comparação entre fontes, equivalente "
              "populacional e relatórios de monitoramento.",
         example="Um efluente de 400 m³/dia com DBO de 180 mg/L lança 72 kg de DBO por dia."),
    dict(n=3, curto="Eficiência", nome="Eficiência de Tratamento", emoji="📉", tools=[c3t1, c3t2],
         card="Avalie quanto um sistema de tratamento removeu, por concentração ou por carga, com gráfico de antes e "
              "depois e interpretação automática.",
         card2="2 ferramentas · % de remoção e gráficos",
         what="Quanto do poluente foi removido em um sistema de tratamento, em porcentagem, usando concentrações ou cargas.",
         when="Avaliação de ETEs, reatores, decantadores, filtros e lagoas; relatórios de monitoramento e aulas práticas.",
         example="DBO de 250 mg/L na entrada e 50 mg/L na saída: eficiência de 80%."),
    dict(n=4, curto="Balanço de Massa", nome="Balanço de Massa", emoji="⚖️", tools=[c4t1, c4t2, c4t3],
         card="Misture duas correntes, feche o balanço de um decantador e calcule o acúmulo de massa em um sistema, "
              "com cada etapa explicada.",
         card2="3 ferramentas · mistura, decantador, acúmulo",
         what="Concentrações e massas em sistemas com entradas e saídas, aplicando a conservação da massa.",
         when="Mistura de efluentes, lançamento em rios, decantadores e adensadores, tanques e reatores, problemas de "
              "regime permanente.",
         example="Duas correntes de 120 e 80 m³/dia, com 200 e 50 mg/L, formam uma mistura de 140 mg/L."),
    dict(n=5, curto="Diluição", nome="Diluição de Soluções", emoji="🧪", tools=[c5],
         card="Prepare soluções no laboratório com C₁V₁ = C₂V₂. Escolha o que quer descobrir e receba a instrução de "
              "preparo pronta.",
         card2="1 fórmula · 4 incógnitas possíveis",
         what="Volume de estoque, concentração final, volume final ou concentração do estoque, usando C₁ × V₁ = C₂ × V₂.",
         when="Preparo de padrões e curvas de calibração, diluição de amostras para análises (DBO, DQO, metais) e aulas "
              "de laboratório.",
         example="Para preparar 500 mL a 200 mg/L com um padrão de 1.000 mg/L, use 100 mL do padrão e complete até 500 mL."),
    dict(n=6, curto="Dosagem Química", nome="Dosagem de Produtos Químicos", emoji="⚗️", tools=[c6],
         card="Calcule a massa de componente ativo, a massa de produto comercial e o volume diário de produto líquido "
              "para uma dosagem definida.",
         card2="3 etapas · kg/dia e L/dia",
         what="A quantidade teórica de produto químico por dia: massa de ativo, massa de produto comercial e volume de "
              "produto líquido.",
         when="Coagulação, desinfecção com cloro, correção de pH, estimativa de custo operacional e planejamento de "
              "estoque em ETAs e ETEs.",
         example="Aplicar 4 mg/L de ativo em 500 m³/dia com produto a 50% exige 4 kg/dia de produto comercial."),
]
