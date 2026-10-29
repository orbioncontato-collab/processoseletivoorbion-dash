"""Textos exibidos na planilha (aba Comece aqui, títulos, regras de referência e cartões do painel)."""
from xlsxwriter.utility import xl_col_to_name
import comum as K
from comum import q, STATUS

REGRAS_REF = [
    ("Período aquisitivo: 12 meses de contrato", "CLT, art. 130",
     "Calcula início e término pelo aniversário da admissão (função EDATE). Admissão em 29/02: o aniversário em ano comum é 01/03."),
    ("Período concessivo: 12 meses seguintes ao aquisitivo", "CLT, art. 134",
     "O gozo deve terminar até o fim do concessivo. Depois disso a planilha só alerta."),
    ("Faltas injustificadas: até 5 = 30 dias; 6 a 14 = 24; 15 a 23 = 18; 24 a 32 = 12", "CLT, art. 130",
     "Usa as faltas que você conferiu. Acima de 32 mostra 0 dias e pede conferência."),
    ("Ausências que não contam como falta (licenças legais, afastamentos previstos, etc.)", "CLT, art. 131",
     "Não entram no campo de faltas. Registre na aba Ocorrências quando precisar de análise."),
    ("Situações que podem fazer perder o direito (licença remunerada longa, afastamento por mais de 6 meses, etc.)", "CLT, art. 133",
     "A planilha não decide. Registre a ocorrência, faça a análise e informe o resultado."),
    ("Fracionamento: até 3 períodos, um com 14 dias corridos ou mais e os demais com 5 ou mais, com concordância do empregado", "CLT, art. 134, §1º",
     "Avalia o conjunto das parcelas do período, inclusive o saldo que ainda falta programar."),
    ("Início vedado nos 2 dias antes de feriado ou do descanso semanal remunerado", "CLT, art. 134, §3º",
     "Confere com os feriados cadastrados e com a escala do vínculo. Sem escala ou calendário revisado, mostra Conferir escala ou Calendário incompleto."),
    ("Aviso por escrito com pelo menos 30 dias de antecedência", "CLT, art. 135",
     "Prazo do aviso = início das férias menos 30 dias."),
    ("Concessão após o prazo: pagamento em dobro", "CLT, art. 137",
     "A planilha só mostra o alerta de concessivo encerrado. Não calcula dobra nem penalidade."),
    ("Férias coletivas", "CLT, arts. 139 a 141",
     "Fora do escopo. Podem ser registradas em Ocorrências para controle, sem cálculo automático."),
    ("Abono pecuniário: até 1/3 do período, pedido até 15 dias antes do fim do aquisitivo", "CLT, art. 143",
     "Limita o abono a 1/3 do direito conferido e alerta pedido fora do prazo."),
    ("Pagamento da remuneração e do abono até 2 dias antes do início", "CLT, art. 145",
     "Prazo do pagamento = início menos 2 dias. Atraso gera alerta próprio, sem cálculo de dobra."),
    ("Tempo parcial: segue a regra geral", "CLT, art. 58-A, §7º", "Tratado como regra geral."),
]

FONTE_REGRAS = ("Revisão das regras: 29/10/2026. Base: Decreto-Lei 5.452/1943 (CLT), arts. 129 a 145, com redação da Lei 13.467/2017. "
                "Texto oficial: planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm. No ambiente de criação, os sites oficiais "
                "não puderam ser abertos; a conferência foi feita em transcrições públicas da lei. Confira o texto oficial antes de usar. "
                "Normas coletivas podem trazer regras diferentes e não são processadas automaticamente.")

CFG_TITULOS = {
    "T_Empresas": ("Empresas", "Uma linha por empresa. O ID separa empresas com matrículas iguais."),
    "T_Estab": ("Estabelecimentos", "Unidades de cada empresa, com município e UF."),
    "T_Local": ("Localidades", "Município e UF usados para aplicar feriados estaduais e municipais."),
    "T_Setores": ("Setores", "Lista usada no cadastro de funcionários."),
    "T_Equipes": ("Equipes e limites internos", "Limite interno de ausências ao mesmo tempo. Não é exigência legal."),
    "T_Cargos": ("Cargos", "Lista usada no cadastro de funcionários."),
    "T_Gestores": ("Gestores", "Quem aprova as férias de cada equipe."),
    "T_Resp": ("Responsáveis", "Pessoas do DP, da conferência e do pagamento."),
    "T_Escalas": ("Escalas e descanso semanal", "Dia do DSR por escala. Escala variável exige registrar os descansos."),
    "T_Desc": ("Descansos de escala variável", "Datas de descanso por vínculo, para escalas como 12x36."),
    "T_Feriados": ("Feriados", "Nacionais, estaduais e municipais, com a fonte consultada."),
    "T_CalRev": ("Calendários revisados", "Marque quando o calendário do ano e da localidade estiver completo."),
    "T_TiposOc": ("Tipos de ocorrência", "Indica se o tipo pode afetar o direito e se impede o gozo."),
    "T_Normas": ("Normas coletivas", "Convenções e acordos de referência. Regras próprias não são calculadas."),
}

ABAS_DADOS = {
    "T_Func": ("Funcionários (vínculos)",
               "Uma linha por vínculo. Uma pessoa readmitida ganha um novo ID de vínculo e o histórico antigo fica preservado. "
               "Não apague vínculos desligados. Não registre CPF completo, dados bancários ou diagnósticos."),
    "T_Per": ("Períodos aquisitivos e saldos",
              "Uma linha por período aquisitivo. Informe o vínculo, o nº do período, as faltas conferidas e a situação da apuração. "
              "Saldo não gozado = direito − gozo confirmado − abono confirmado. Saldo disponível = saldo não gozado − reservas."),
    "T_Prog": ("Programação de férias (parcelas)",
               "Uma linha por parcela. A situação é sempre escolhida por você: a data passar não conclui as férias. "
               "Para reagendar, marque a antiga como Cancelada e crie outra linha informando a programação anterior."),
    "T_Oc": ("Ocorrências",
             "Afastamentos, licenças e outras situações que podem afetar o direito ou o gozo. Use só a referência do documento, "
             "sem diagnóstico médico. Enquanto a análise estiver pendente, o período mostra Direito pendente de conferência."),
    "T_Prov": ("Providências por programação",
               "Uma linha por programação. Registre aviso, ciência, conferência de valores, pagamento, registro no sistema e arquivo. "
               "Agendar um pagamento não confirma o pagamento. Um link de evidência não confirma que o documento foi conferido."),
    "T_Est": ("Estimativa de valores brutos",
              "Ferramenta de planejamento. Informe salário e médias já apuradas. A estimativa é bruta, sem INSS, IRRF, descontos "
              "ou encargos da empresa, e não altera nenhum saldo de dias."),
}


def painel_cards():
    """(título, fórmula do valor, formato numérico, fórmula do detalhe, cor de destaque)."""
    fmt = lambda u1, u2: f'[=1]0" {u1}";0" {u2}"'
    return [
        ("Vínculos ativos", '=COUNTIF(T_Func[Situação do vínculo],"Ativo")', fmt("vínculo", "vínculos"),
         '="Afastados: "&COUNTIF(T_Func[Situação do vínculo],"Afastado")&"  ·  Desligados: "&COUNTIF(T_Func[Situação do vínculo],"Desligado")', "azul"),
        ("Pessoas em férias na data de referência", "=SUM(T_Func[Téc em férias])", fmt("pessoa", "pessoas"),
         '="Programações marcadas como Em gozo: "&COUNTIF(T_Prog[Situação da programação],"Em gozo")', "azul"),
        ("Programações aprovadas para os próximos 30 dias", '=COUNTIFS(T_Prog[Téc S],3,T_Prog[Data de início],">"&DataRef,T_Prog[Data de início],"<="&(DataRef+30))',
         fmt("programação", "programações"), '="Solicitações aguardando análise: "&COUNTIF(T_Prog[Téc S],2)', "azul"),
        ("Períodos com saldo e concessivo encerrado", "=COUNTIF(T_Per[Téc código],12)", fmt("período", "períodos"),
         '="Conferir concessão fora do prazo. A planilha não calcula dobra."', "vermelho"),
        ("Períodos próximos do limite do concessivo", '=COUNTIFS(T_Per[Téc código],">=13",T_Per[Téc código],"<=16")', fmt("período", "períodos"),
         '="Até "&Alerta3&" dias ou sem prazo para o aviso: "&COUNTIFS(T_Per[Téc código],">=13",T_Per[Téc código],"<=14")&"  ·  Faixa interna: "&Alerta1&" dias"', "amarelo"),
        ("Dias disponíveis para programar", '=SUMIFS(T_Per[Saldo disponível],T_Per[Téc código],">=13",T_Per[Téc código],"<=17")', fmt("dia", "dias"),
         '="Em "&COUNTIFS(T_Per[Téc código],">=13",T_Per[Téc código],"<=17")&" períodos com aquisitivo completo"', "azul"),
        ("Avisos de férias pendentes", "=SUM(T_Prog[Téc aviso pend])", fmt("programação", "programações"),
         '="Com prazo legal vencido: "&SUM(T_Prog[Téc aviso atras])', "vermelho"),
        ("Pagamentos ainda não confirmados", "=SUM(T_Prog[Téc pag pend])", fmt("programação", "programações"),
         '="Com prazo legal vencido: "&SUM(T_Prog[Téc pag atras])&"  ·  Só agendados: "&COUNTIFS(T_Prov[Situação do pagamento],"Agendado",T_Prov[Téc S],">=3",T_Prov[Téc S],"<=4")', "vermelho"),
        ("Ocorrências aguardando análise", "=SUM(T_Oc[Téc pendente])", fmt("ocorrência", "ocorrências"),
         '="Períodos com direito pendente de conferência: "&COUNTIF(T_Per[Téc código],7)', "amarelo"),
        ("Programações com conflito de equipe", "=COUNTIF(T_Prog[Téc conflito],1)", fmt("programação", "programações"),
         '="Solicitações que gerariam conflito se aprovadas: "&COUNTIF(T_Prog[Téc conflito],2)', "amarelo"),
        ("Programações incompatíveis", '=COUNTIF(T_Prog[Validação do conjunto],"Incompatível")', fmt("programação", "programações"),
         '="Parciais, ainda em construção: "&COUNTIF(T_Prog[Validação do conjunto],"Parcial: em construção")', "vermelho"),
        ("Cadastros de vínculo com pendência", '=COUNTIF(T_Func[Téc G],">0")', fmt("vínculo", "vínculos"),
         '="Períodos aquisitivos a cadastrar: "&COUNTIF(T_Func[Téc código],14)', "amarelo"),
    ]


SECOES = [
    ("Para que serve", [
        "Controlar férias individuais de contratos CLT comuns: períodos aquisitivos, saldos, parcelas, avisos, pagamentos, documentos e conflitos de equipe.",
        "Responder rápido: quem já tem direito, quanto falta gozar, quanto já está reservado, quanto ainda pode ser programado e o que precisa ser feito primeiro.",
        "A planilha organiza e confere registros. Ela não substitui o sistema de folha e não faz interpretação jurídica automática.",
    ]),
    ("Para quem e até onde vai", [
        "Feita para auxiliares, assistentes e analistas de DP, RH, pequenas empresas, escritórios contábeis com várias empresas e estudantes.",
        "Aplica a regra geral da CLT. Doméstico, intermitente e outros regimes especiais ficam marcados como Análise específica e não recebem cálculo automático do direito.",
        "Férias coletivas podem ser registradas em Ocorrências, mas não são tratadas como férias individuais.",
    ]),
    ("Ordem de preenchimento", [
        "1. Aba 02 Configurações: empresas, estabelecimentos, localidades, setores, equipes, escalas, feriados e responsáveis.",
        "2. Aba 03 Funcionários: uma linha por vínculo.",
        "3. Aba 04 Períodos e saldos: um período aquisitivo por linha, com faltas conferidas e histórico anterior.",
        "4. Aba 06 Ocorrências: afastamentos e licenças que possam afetar o direito ou o gozo.",
        "5. Aba 05 Programação: uma parcela por linha.",
        "6. Aba 07 Providências: aviso, pagamento, registro e arquivo de cada programação.",
        "7. Consulte as abas 09 Painel, 08 Calendário e 10 Ficha individual.",
    ]),
    ("Campos editáveis e calculados", [
        "Cabeçalho azul-marinho e célula branca: você preenche.",
        "Cabeçalho cinza-azulado e célula cinza-clara: resultado calculado. Está protegido contra edição acidental.",
        "Colunas técnicas ficam ocultas no fim de cada tabela. Elas guardam cálculos de apoio e não precisam ser editadas.",
        "Passe o mouse sobre o triângulo vermelho de um cabeçalho para ler a explicação do campo.",
    ]),
    ("Como cadastrar funcionários", [
        "Use um ID único por vínculo, como V0001. O topo da aba mostra o próximo ID sugerido.",
        "Pessoa readmitida: crie um novo vínculo com novo ID. O vínculo antigo continua como Desligado, com a data de desligamento.",
        "A mesma matrícula pode existir em empresas diferentes. A planilha separa os registros pelo ID do vínculo.",
        "Escolha a escala (define o DSR) e a localidade (define os feriados). Sem isso o retorno e a vedação de início não podem ser conferidos.",
    ]),
    ("Como registrar saldos anteriores", [
        "Na aba 04, use as colunas Gozo anterior à planilha, Abono anterior à planilha, Parcelas anteriores e Maior parcela anterior.",
        "Esses campos servem só para o que aconteceu antes de você começar a usar a planilha. Não lance a mesma parcela também na aba 05.",
        "Exemplo: direito 30, 10 dias gozados antes da planilha e 14 dias aprovados na aba 05. Saldo não gozado = 20. Saldo disponível = 6.",
    ]),
    ("Como programar férias", [
        "Na aba 05, informe vínculo, período, data de início, dias de gozo e a situação.",
        "Rascunho é simulação e não reserva saldo. Solicitada aparece como demanda, sem reservar. Aprovada e Em gozo reservam os dias.",
        "Concluída transforma a reserva em gozo confirmado. Cancelada libera os dias e mantém o registro.",
        "A planilha nunca muda a situação sozinha. Quando a data passa, ela pede para você atualizar.",
    ]),
    ("Como registrar fracionamento", [
        "Crie uma linha para cada parcela, todas com o mesmo ID do período, e marque a concordância do empregado.",
        "A coluna Validação do conjunto olha todas as parcelas do período: até 3 parcelas, uma com 14 dias ou mais e as outras com 5 ou mais.",
        "Parcial: em construção quer dizer que ainda falta programar dias, mas a combinação ainda é possível. Incompatível quer dizer que a combinação não fecha.",
    ]),
    ("Como cancelar e reagendar", [
        "Mude a situação da parcela antiga para Cancelada e escreva o motivo. Não apague a linha.",
        "Crie uma nova linha com novo ID e informe a antiga em Programação anterior relacionada. Só a nova reserva saldo.",
    ]),
    ("Como acompanhar aviso e pagamento", [
        "Na aba 07, crie uma linha para cada programação aprovada. O prazo legal do aviso é o início menos 30 dias. O do pagamento é o início menos 2 dias.",
        "Pagamento tem quatro estados: Previsto, Agendado, Realizado e Confirmado. Só Confirmado encerra a pendência.",
        "Informe a data de ciência do empregado e marque Conteúdo do aviso conferido. O link da evidência sozinho não conta como conferência.",
    ]),
    ("Como usar o calendário", [
        "Na aba 08, escolha mês, ano, empresa, estabelecimento, setor e equipe. Mostra até 60 programações por filtro.",
        "S = solicitada, A = aprovada, G = em gozo, C = concluída. Canceladas e rascunhos não aparecem.",
        "Escolha uma equipe para comparar as ausências de cada dia com o limite interno. Sem limite cadastrado aparece Limite não definido.",
    ]),
    ("Como imprimir a ficha individual", [
        "Na aba 10, escolha o ID do vínculo. A impressão já está em A4 paisagem, ajustada à largura, com cabeçalho repetido e páginas numeradas.",
    ]),
    ("Como adicionar registros", [
        "As tabelas já vêm com linhas prontas: 600 vínculos, 1.500 períodos, 2.000 programações, 2.000 providências, 500 ocorrências e 300 estimativas.",
        "Basta digitar na próxima linha branca. Fórmulas, listas e cores já estão nas linhas vazias.",
        "Para passar desse limite: Revisão > Desproteger Planilha (senha FERIAS), arraste a alça do canto inferior direito da tabela para baixo e proteja de novo. As fórmulas calculadas são copiadas pelo Excel.",
        "Com a planilha protegida o Excel não deixa inserir linhas dentro das tabelas. Por isso as linhas já vêm prontas.",
    ]),
    ("Como fazer cópia de segurança", [
        "Antes de mudanças grandes, salve uma cópia com a data no nome, como Controle_de_Ferias_2026-10-29.xlsx.",
        "Guarde cópias em outro local (pasta da empresa ou nuvem). A planilha não guarda histórico automático de quem alterou cada célula.",
        "Use os campos de responsável, data e justificativa para registrar ajustes e cancelamentos.",
    ]),
    ("Limites da estimativa de valores", [
        "A aba 11 estima valor bruto de férias, terço, abono e terço do abono, com base mensal ÷ 30 para mensalista.",
        "Médias e adicionais precisam ser apurados por você. Não há cálculo de INSS, IRRF, descontos, líquido ou custo da empresa.",
        "Os valores não alteram o saldo de dias.",
    ]),
    ("Proteção e segurança", [
        "As abas estão protegidas com a senha FERIAS só para evitar que uma fórmula seja apagada sem querer. Isso não é segurança nem criptografia dos dados.",
        "Filtros continuam funcionando com a planilha protegida.",
    ]),
]


def comece_aqui(b, ws):
    ws.hide_gridlines(2)
    ws.set_tab_color("#1F3864")
    ws.set_column(0, 0, 2)
    ws.set_column(1, 1, 30)
    ws.set_column(2, 2, 104)
    F = b.F
    demo = b.data.get("demo", False)
    ws.set_row(0, 36)
    ws.write(0, 1, "PLANILHA PRONTA DE CONTROLE DE FÉRIAS", F(bold=True, font_size=20, font_color=K.NAVY))
    ws.write(1, 1, "Bônus do produto 160 Mapas Visuais de Departamento Pessoal", F(italic=True, font_size=10, font_color="#5F7391"))
    ws.write(1, 2, f"Versão {K.VERSAO}  ·  Criada em {K.DATA_CRIACAO:%d/%m/%Y}  ·  Regras revisadas em {K.DATA_REVISAO_REGRAS:%d/%m/%Y}  ·  Sem macros",
             F(font_size=9, font_color="#5F7391", align="right"))
    r = 3
    if demo:
        ws.merge_range(r, 1, r, 2, f"VERSÃO DEMONSTRATIVA: TODOS OS NOMES, EMPRESAS E VALORES SÃO FICTÍCIOS. "
                       f"Data de referência fixa em {K.DATA_REF_DEMO:%d/%m/%Y} (aba 02) para os exemplos fazerem sentido em qualquer dia.",
                       F(bold=True, font_size=11, bg_color=STATUS[2][0], font_color="#7F6000", text_wrap=True, border=2,
                         border_color="#BF9000"))
        ws.set_row(r, 36)
        r += 2
    ws.merge_range(r, 1, r, 2, "Programar férias não significa que elas foram gozadas. Prever um pagamento não significa que ele foi realizado.",
                   F(bold=True, font_size=12, bg_color=K.NAVY, font_color="#FFFFFF", align="center", text_wrap=True))
    ws.set_row(r, 30)
    r += 2
    # navegação
    ws.write(r, 1, "IR PARA", F(bold=True, font_size=11, font_color=K.NAVY, bottom=2, bottom_color=K.NAVY))
    ws.write(r, 2, "", F(bottom=2, bottom_color=K.NAVY))
    nav = [(K.S_CONFIG, "Empresas, estrutura, escalas, feriados e parâmetros."),
           (K.S_FUNC, "Cadastro dos vínculos."), (K.S_PER, "Direito, gozo, abono, reservas e saldos de cada período."),
           (K.S_PROG, "Parcelas de férias e validações."), (K.S_OC, "Afastamentos e licenças que pedem análise."),
           (K.S_PROV, "Aviso, pagamento, registro e arquivo."), (K.S_CAL, "Quem estará ausente em cada dia do mês."),
           (K.S_PAINEL, "Indicadores e lista de próximas ações."), (K.S_FICHA, "Resumo de um vínculo para consulta e impressão."),
           (K.S_EST, "Estimativa de valor bruto."), (K.S_APOIO, "Listas e cálculos técnicos. Não precisa mexer.")]
    for sh, desc in nav:
        r += 1
        ws.write_url(r, 1, f"internal:{q(sh)}!A1", F(font_color="#1F4E79", underline=1, bold=True), sh)
        ws.write(r, 2, desc, F(font_size=10))
    r += 2
    # legenda de cores
    ws.write(r, 1, "LEGENDA DE CORES", F(bold=True, font_size=11, font_color=K.NAVY, bottom=2, bottom_color=K.NAVY))
    ws.write(r, 2, "", F(bottom=2, bottom_color=K.NAVY))
    leg = [(1, "Vermelho", "Pendência crítica, prazo encerrado ou inconsistência que impede seguir. Exemplos: Saldo insuficiente, Aviso atrasado."),
           (2, "Amarelo", "Atenção, prazo próximo ou análise necessária. Exemplos: Conferir direito, Conferir escala, Calendário incompleto."),
           (3, "Azul", "Programação em acompanhamento. Exemplo: Pagamento previsto até a data indicada."),
           (4, "Verde", "Etapa conferida ou concluída segundo os registros. Não quer dizer que todo o processo foi validado."),
           (5, "Cinza", "Cancelado, arquivado, simulação ou não aplicável.")]
    for k, a, c in leg:
        r += 1
        ws.write(r, 1, a, F(bold=True, bg_color=STATUS[k][0], font_color=STATUS[k][1], align="center", border=1, border_color="#FFFFFF"))
        ws.write(r, 2, c, F(font_size=10, text_wrap=True))
    r += 1
    ws.write(r, 1, "Você preenche", F(bg_color="#FFFFFF", border=1, border_color=K.NAVY, align="center"))
    ws.write(r, 2, "Célula branca com cabeçalho azul-marinho.", F(font_size=10))
    r += 1
    ws.write(r, 1, "Calculado", F(bg_color=K.CALC_BG, border=1, border_color=K.CALC_HDR, align="center"))
    ws.write(r, 2, "Célula cinza-clara com cabeçalho cinza-azulado. Protegida.", F(font_size=10))
    r += 1
    ws.write(r, 1, "Orientação", F(bg_color=K.LIGHT_BLUE, align="center"))
    ws.write(r, 2, "Faixa azul-clara no topo de cada aba explica o que fazer ali.", F(font_size=10))
    r += 1
    ws.write(r, 2, "A cor sempre vem acompanhada de um texto. A planilha não usa “Tudo certo”: o verde vale só para a etapa indicada.",
             F(font_size=9, italic=True, font_color="#404040"))
    head = F(bold=True, font_size=11, font_color="#FFFFFF", bg_color=K.NAVY2, valign="top", text_wrap=True)
    body = F(font_size=10, text_wrap=True, valign="top", border=1, border_color="#E3E8F0")
    for titulo, linhas in SECOES:
        r += 2
        first = r
        for i, ln in enumerate(linhas):
            ws.write(r, 2, ln, body)
            ws.set_row(r, 15 * max(1, -(-len(ln) // 120)) + 3)
            r += 1
        if len(linhas) > 1:
            ws.merge_range(first, 1, r - 1, 1, titulo, head)
        else:
            ws.write(first, 1, titulo, head)
        r -= 1
    r += 2
    ws.write(r, 1, "Versão e regras", F(bold=True, font_size=11, font_color=K.NAVY))
    ws.write(r, 2, f"Versão {K.VERSAO}. Regras revisadas em {K.DATA_REVISAO_REGRAS:%d/%m/%Y}. Detalhes e fontes na aba 02 Configurações, "
             "bloco Prazos da regra geral. Leia também o arquivo Leia-me.txt.", F(font_size=10, text_wrap=True))
    ws.set_row(r, 30)
    ws.set_paper(9)
    ws.fit_to_pages(1, 0)
    ws.print_area(0, 1, r, 2)
    ws.set_footer("&L&8Controle de Férias  ·  Comece aqui&R&8Página &P de &N")
