"""Gera a versão editável (.docx) do material. Abre no Word e no Google Docs.
Uso: python3 docx_build.py saida.docx"""
import sys
from docx import Document
from docx.shared import Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

NAVY=RGBColor(0x0A,0x11,0x23); GREEN=RGBColor(0x74,0xFA,0xA5); BLUE=RGBColor(0x29,0x5D,0x86)
DEEP=RGBColor(0x26,0x5C,0x58); MUTED=RGBColor(0x46,0x56,0x6B); WHITE=RGBColor(0xFF,0xFF,0xFF)
doc=Document()
sec=doc.sections[0]
sec.page_width=Mm(210); sec.page_height=Mm(297)
for side in ('left_margin','right_margin'): setattr(sec,side,Mm(20))
sec.top_margin=Mm(15); sec.bottom_margin=Mm(15)
st=doc.styles['Normal']; st.font.name='Inter'; st.font.size=Pt(10)
st.element.rPr.rFonts.set(qn('w:eastAsia'),'Inter')
st.paragraph_format.space_after=Pt(3); st.paragraph_format.line_spacing=1.12

def shade(cell,hexcolor):
    tcPr=cell._tc.get_or_add_tcPr(); sh=OxmlElement('w:shd')
    sh.set(qn('w:val'),'clear'); sh.set(qn('w:color'),'auto'); sh.set(qn('w:fill'),hexcolor); tcPr.append(sh)
def fix_widths(t, widths):
    t.autofit=False
    tblPr=t._tbl.tblPr
    lay=OxmlElement('w:tblLayout'); lay.set(qn('w:type'),'fixed'); tblPr.append(lay)
    grid=t._tbl.tblGrid
    for j,gc in enumerate(grid.findall(qn('w:gridCol'))):
        if j<len(widths): gc.set(qn('w:w'),str(int(widths[j]*56.7)))
    for r in t.rows:
        for j,c in enumerate(r.cells):
            if j<len(widths): c.width=Mm(widths[j])
def cell_margins(table, mm=2.0):
    tblPr=table._tbl.tblPr; m=OxmlElement('w:tblCellMar')
    for s in ('top','left','bottom','right'):
        e=OxmlElement(f'w:{s}'); e.set(qn('w:w'),str(int(mm*56.7))); e.set(qn('w:type'),'dxa'); m.append(e)
    tblPr.append(m)
def run(p,text,bold=False,color=None,size=None,italic=False):
    r=p.add_run(text); r.bold=bold; r.italic=italic
    if color is not None: r.font.color.rgb=color
    if size: r.font.size=Pt(size)
    return r
def para(text='',bold=False,color=None,size=None,align=None,after=None):
    p=doc.add_paragraph(); 
    if text: run(p,text,bold,color,size)
    if align: p.alignment=align
    if after is not None: p.paragraph_format.space_after=Pt(after)
    return p
def rich(parts, size=None):
    p=doc.add_paragraph()
    for t in parts:
        if isinstance(t,tuple): run(p,t[0],bold=True,color=t[1] if len(t)>1 else None,size=size)
        else: run(p,t,size=size)
    return p
def eyebrow(t):
    p=para(t.upper(),True,BLUE,8.5,after=2)
    if NEXT[0]: p.paragraph_format.page_break_before=True; NEXT[0]=False
def title(t): 
    p=para(t,True,NAVY,19,after=6)
def h2(t): 
    p=para(t,True,NAVY,13.5,after=4); p.paragraph_format.space_before=Pt(8)
def bullets(items):
    for it in items:
        p=doc.add_paragraph(style='List Bullet'); run(p,it)
        p.paragraph_format.space_after=Pt(2)
NEXT=[False]
def pagebreak(): NEXT[0]=True
def box(lines, fill='F4F7FA', color=None, bold_first=False):
    t=doc.add_table(rows=1,cols=1); t.alignment=WD_TABLE_ALIGNMENT.CENTER; cell_margins(t,3.5); fix_widths(t,[170])
    c=t.cell(0,0); shade(c,fill); c.paragraphs[0].text=''
    for i,l in enumerate(lines):
        p=c.paragraphs[0] if i==0 else c.add_paragraph()
        p.paragraph_format.space_after=Pt(2)
        if isinstance(l,list):
            for part in l:
                if isinstance(part,tuple): run(p,part[0],True,part[1] if len(part)>1 else color)
                else: run(p,part,color=color)
        else: run(p,l,bold=(bold_first and i==0),color=color)
        p.paragraph_format.space_after=Pt(2)
    sp=doc.add_paragraph(); sp.paragraph_format.space_after=Pt(0); sp.paragraph_format.line_spacing=0.6
def checklist(rng, area, items, start):
    t=doc.add_table(rows=1+len(items),cols=3); t.alignment=WD_TABLE_ALIGNMENT.CENTER; cell_margins(t,1.3)
    h=t.rows[0].cells; m=h[0].merge(h[2]); shade(m,'0A1123'); m.paragraphs[0].text=''
    run(m.paragraphs[0],'CHECKLIST ',True,GREEN,9); run(m.paragraphs[0],rng,True,WHITE,11); run(m.paragraphs[0],'   '+area,False,RGBColor(0xC3,0xCC,0xDA),9)
    for i,it in enumerate(items):
        c=t.rows[i+1].cells; shade(c[0],'F4F7FA'); shade(c[1],'F4F7FA'); shade(c[2],'F4F7FA')
        run(c[0].paragraphs[0],'☐',size=13,color=BLUE); run(c[1].paragraphs[0],f'{start+i:02d}',True,BLUE); run(c[2].paragraphs[0],it)
    fix_widths(t,[9,10,151])
    sp=doc.add_paragraph(); sp.paragraph_format.space_after=Pt(0); sp.paragraph_format.line_spacing=0.6
def table(header, rows, widths=None, fill_cols=()):
    t=doc.add_table(rows=1+len(rows),cols=len(header)); t.style='Table Grid'; t.alignment=WD_TABLE_ALIGNMENT.CENTER; cell_margins(t,1.3)
    for j,hd in enumerate(header):
        c=t.rows[0].cells[j]; shade(c,'0A1123'); c.paragraphs[0].text=''; run(c.paragraphs[0],hd.upper(),True,WHITE,8.5)
    for i,row in enumerate(rows):
        for j,v in enumerate(row):
            c=t.rows[i+1].cells[j]; c.paragraphs[0].text=''
            if isinstance(v,tuple): run(c.paragraphs[0],v[0],True)
            else: run(c.paragraphs[0],v, color=(MUTED if j in fill_cols else None))
    if widths: fix_widths(t,widths)
    doc.add_paragraph().paragraph_format.space_after=Pt(2)
    return t
def footer():
    f=sec.footer.paragraphs[0]; f.text=''; run(f,'Marcelo Alves  |  @alvesmarcelobr  |  Black Friday de Dono',size=8,color=MUTED)
    # número de página
    r=f.add_run('    '); fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); rr=OxmlElement('w:r'); tt=OxmlElement('w:t'); tt.text='1'; rr.append(tt); fld.append(rr); f._p.append(fld)
footer()
L='______________________________________________'

# 01 CAPA
t=doc.add_table(rows=1,cols=1); c=t.cell(0,0); shade(c,'0A1123'); cell_margins(t,10); fix_widths(t,[170])
p=c.paragraphs[0]; run(p,'MARCELO ALVES  |  ORBION SALES',True,RGBColor(0xAE,0xB9,0xCA),9)
for _ in range(5): c.add_paragraph()
p=c.add_paragraph(); run(p,'BLACK FRIDAY\n',True,WHITE,40); run(p,'DE DONO',True,GREEN,40)
p=c.add_paragraph(); run(p,'O Checklist Comercial para Preparar sua Empresa e Vender Mais',False,WHITE,15)
c.add_paragraph()
p=c.add_paragraph(); run(p,'40 ',True,GREEN,30); run(p,'pontos de verificação para organizar suas ofertas, ativar clientes, preparar o time e acompanhar os resultados da campanha.',True,WHITE,11.5)
for _ in range(5): c.add_paragraph()
p=c.add_paragraph(); run(p,'Um guia prático para empresários.',False,GREEN,11)
p=c.add_paragraph(); run(p,'Marcelo Alves\n',True,WHITE,15); run(p,'CEO | Orbion Sales  ·  @alvesmarcelobr',False,RGBColor(0xAE,0xB9,0xCA),10)
pagebreak()

# 02
eyebrow('Mensagem de abertura'); title('Antes de começar sua Black Friday, leia isso.')
para('Todos os anos, milhares de empresas se preparam para a Black Friday criando promoções, divulgando ofertas e tentando atrair novos clientes.')
para('Mas existe uma pergunta que todo empresário deveria fazer antes de começar:')
box([[('Minha empresa está preparada para transformar essa demanda em vendas lucrativas?',GREEN)]],fill='0A1123')
for t_ in ['Uma campanha envolve várias decisões.','É necessário definir as ofertas certas, conhecer as margens, preparar o atendimento, aproveitar os clientes que já conhecem sua empresa e acompanhar os resultados.','Foi pensando nisso que organizei este material.','Aqui você encontrará um checklist para avaliar sua operação e um plano prático para preparar sua Black Friday.']: para(t_)
rich(['Meu conselho é simples: ',('não deixe todas as decisões para a semana da campanha.',)])
para('Uma boa preparação dá mais clareza para o empresário e mais organização para a equipe.')
p=para('Marcelo Alves',True,NAVY,13,after=0); para('Gestão e Estruturação Comercial',color=MUTED,size=9.5)
pagebreak()

# 03
eyebrow('O mapa da campanha'); title('As 8 áreas que você precisa preparar')
para('Essas oito áreas formam os 40 pontos de verificação do checklist. Cada área tem 5 pontos.')
areas=[('01','Diagnóstico e metas','Entender o cenário atual e estabelecer o resultado esperado.','01 a 05'),
('02','Ofertas e lucratividade','Criar condições atrativas, considerando os custos e as margens.','06 a 10'),
('03','Base de clientes','Identificar oportunidades de recompra e negociações que podem ser retomadas.','11 a 15'),
('04','Lista VIP e comunicação','Organizar os interessados e preparar a divulgação antecipada.','16 a 20'),
('05','Operação comercial','Definir atendimento, responsáveis, CRM e acompanhamento.','21 a 25'),
('06','Divulgação e aquisição','Planejar os canais e os investimentos para alcançar o público certo.','26 a 30'),
('07','Indicadores e execução','Monitorar os resultados e tomar decisões durante a campanha.','31 a 35'),
('08','Pós-Black Friday','Aproveitar as oportunidades que continuam após o encerramento.','36 a 40')]
table(['Área','O que preparar','Itens'],[((a[0]+'. '+a[1]),a[2],a[3]) for a in areas],[55,90,25])
pagebreak()

# 04
eyebrow('Etapa 1 · Diagnóstico'); title('Comece olhando para os números da sua empresa.')
para('Antes de definir quanto deseja vender, descubra como seu comercial está funcionando hoje.'); para('Levante os números dos últimos 30 a 90 dias.')
h2('Informações que você precisa conhecer')
bullets(['Faturamento mensal.','Quantidade de vendas.','Ticket médio.','Quantidade de novos interessados.','Quantidade de propostas ou orçamentos.','Taxa de conversão.','Margem de contribuição.','Capacidade de atendimento e entrega.'])
box(['Exemplo prático (números ilustrativos)','Uma empresa recebe 200 oportunidades em um mês e fecha 20 vendas.','Sua conversão de oportunidades em vendas é de 10%.','Se ela conseguir aumentar a conversão para 15%, mantendo o mesmo volume de oportunidades, poderá realizar 30 vendas.','Esse exemplo mostra por que vale a pena analisar o processo comercial antes de investir mais em divulgação.'],bold_first=True)
checklist('01 a 05','Diagnóstico e metas',['Conheço meu faturamento atual.','Sei quantas vendas realizo por mês.','Conheço o ticket médio da empresa.','Sei minha taxa de conversão comercial.','Defini uma meta financeira para a campanha.'],1)
pagebreak()

# 05
eyebrow('Etapa 1 · Definindo a meta'); title('Como transformar uma meta de faturamento em um plano comercial.')
para('Utilize o seguinte exemplo ilustrativo:',color=MUTED)
box([[('Meta de faturamento da Black Friday: R$ 20.000',)],'Ticket médio planejado: R$ 500','Quantidade necessária de vendas: 40','Conversão estimada de propostas em vendas: 25%','Propostas necessárias: 160','Se metade dos contatos qualificados receber uma proposta, serão necessários 320 contatos qualificados.','Se 80% dos interessados se tornarem contatos qualificados, a empresa precisará gerar aproximadamente 400 interessados.'])
h2('O funil do exemplo')
for i,(a,b) in enumerate([('400','interessados'),('320','contatos qualificados'),('160','propostas'),('40','vendas'),('R$ 20.000','em faturamento')]):
    p=para(after=0); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(p,a+' ',True,BLUE,13); run(p,b)
    if i<4: p=para('↓',color=MUTED,after=0); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
para('As taxas do exemplo são hipotéticas. Cada empresa deve substituir esses percentuais pelos próprios indicadores.',color=MUTED,size=9.5)
h2('Sua vez de preencher')
table(['Indicador','Como calcular','Minha meta'],[(('Faturamento desejado',),'Quanto quero vender na campanha','R$ ______'),(('Ticket médio esperado',),'Valor médio de cada venda','R$ ______'),(('Quantidade de vendas',),'Faturamento ÷ ticket médio','______'),(('Propostas necessárias',),'Vendas ÷ conversão de propostas','______'),(('Contatos qualificados',),'Propostas ÷ % que recebe proposta','______'),(('Interessados necessários',),'Qualificados ÷ % de qualificação','______')],[55,70,45],fill_cols=(1,))
rich([('Pergunta de gestão: ',),'sua operação consegue atender a quantidade de oportunidades que essa meta exige?'])
pagebreak()

# 06
eyebrow('Etapa 2 · Combos e ofertas'); title('Como montar ofertas que tenham valor para o cliente.')
para('Uma estratégia interessante para a Black Friday é combinar produtos ou serviços complementares.')
para('Essa combinação pode aumentar o ticket médio, melhorar a experiência do cliente e dar mais atratividade à campanha.')
box(['Exemplo 1: Loja de roupas','Monte combinações de peças que formem looks completos.','Em vez de promover somente uma camisa, crie uma oferta com camisa e calça.'],bold_first=True)
box(['Exemplo 2: Empresa de serviços','Combine serviços que atendam a uma mesma necessidade do cliente.','Por exemplo, um serviço principal acompanhado de uma revisão, orientação ou suporte adicional.'],bold_first=True)
box(['Exemplo 3: Loja de materiais e ferramentas','Crie kits para projetos específicos, reunindo produtos que normalmente são comprados juntos.'],bold_first=True)
h2('Como escolher uma boa oferta'); para('Analise quatro pontos:')
for i,q in enumerate(['O produto ou serviço tem demanda?','A combinação é útil para o cliente?','Existe capacidade de entrega?','A margem continua saudável?'],1):
    p=para(after=2); run(p,f'{i}. ',True,BLUE); run(p,q)
rich([('Dica de gestão: ',),'compare o ticket e a margem da oferta combinada com os resultados que a empresa teria vendendo os itens separadamente.'])
pagebreak()

# 07
eyebrow('Etapa 2 · Como proteger a margem'); title('Faturamento alto precisa fazer sentido no caixa.')
para('Toda oferta deve passar por uma análise financeira.'); para('Considere o seguinte exemplo fictício de um combo vendido por R$ 249.')
t=table(['Componente','Valor'],[(('Preço do combo',),('R$ 249',)),('Custo dos produtos','R$ 120'),('Frete subsidiado','R$ 20'),('Taxas de pagamento','R$ 8'),('Tributos variáveis estimados','R$ 20'),('Comissão','R$ 15'),(('Margem de contribuição em reais',),('R$ 66',))],[120,50])
for r in t.rows[1:]: r.cells[1].paragraphs[0].alignment=WD_ALIGN_PARAGRAPH.RIGHT
shade(t.rows[-1].cells[0],'C7FCDA'); shade(t.rows[-1].cells[1],'C7FCDA')
para('Nesse exemplo, a margem de contribuição é de aproximadamente 26,5% da receita (R$ 66 ÷ R$ 249 × 100).')
para('Esse valor ainda precisará ajudar a cobrir os gastos fixos e demais despesas não consideradas, inclusive eventuais custos de aquisição de clientes.',color=MUTED)
h2('Três cálculos importantes')
rich([('Ticket médio: ',BLUE),'Faturamento ÷ número de vendas.'])
rich([('Margem de contribuição por venda: ',BLUE),'Preço de venda − custos e despesas variáveis daquela venda.'])
rich([('Margem de contribuição percentual: ',BLUE),'Margem de contribuição ÷ preço de venda × 100.'])
checklist('06 a 10','Ofertas e lucratividade',['Escolhi os produtos ou serviços da campanha.','Analisei a procura e o potencial de venda.','Criei ofertas ou combinações complementares.','Calculei os custos e as margens.','Validei estoque, agenda e capacidade de entrega.'],6)
pagebreak()

# 08
eyebrow('Etapa 3 · Ative sua base'); title('Sua empresa já tem pessoas que conhecem seus produtos e serviços.')
para('Antes de concentrar todos os esforços em atrair novos interessados, analise as oportunidades que já existem.')
para('Seu CRM pode revelar clientes que compraram anteriormente, pessoas que solicitaram orçamento e negociações que ficaram sem conclusão.')
h2('Quatro grupos importantes')
for g,(n,d) in enumerate([('Clientes recentes','Pessoas que compraram há pouco tempo e podem ter interesse em produtos complementares.'),('Clientes inativos','Pessoas que já compraram, mas estão há algum tempo sem retornar.'),('Orçamentos não fechados','Interessados que solicitaram informações, receberam uma proposta e ainda não concluíram a compra.'),('Interessados recentes','Pessoas que fizeram contato, demonstraram interesse e ainda estão avaliando.')],1):
    box([f'Grupo {g}. {n}',d],bold_first=True)
para('Cada grupo merece uma abordagem própria, respeitando as preferências de comunicação e as permissões existentes.',True)
pagebreak()

# 09
eyebrow('Etapa 3 · Matriz de reativação'); title('Qual oferta apresentar para cada tipo de cliente?')
table(['Público','Oportunidade','Abordagem'],[(('Cliente recente',),'Venda complementar','Apresentar um item ou serviço relacionado'),(('Cliente inativo',),'Nova compra','Convite personalizado para conhecer a campanha'),(('Orçamento pendente',),'Retomada da negociação','Atualizar as condições e verificar o interesse'),(('Interessado recente',),'Primeira compra','Explicar a oferta e orientar a decisão')],[45,45,80])
h2('Exemplo prático (números ilustrativos)'); para('Imagine uma empresa com:')
bullets(['120 clientes antigos.','80 orçamentos não fechados.','100 interessados recentes.'])
para('Ela possui 300 contatos que podem ser analisados para identificar oportunidades, observadas as permissões de comunicação.')
para('O próximo passo é organizar, qualificar e priorizar esses contatos.',True)
checklist('11 a 15','Base de clientes',['Organizei minha base de clientes.','Identifiquei clientes inativos.','Separei propostas e orçamentos pendentes.','Segmentei os contatos por perfil de interesse.','Preparei abordagens personalizadas e adequadas às permissões de contato.'],11)
pagebreak()

# 10
eyebrow('Etapa 4 · Lista VIP'); title('Prepare o público antes do início das ofertas.')
para('Uma lista VIP pode ajudar a reunir clientes interessados nas condições especiais da campanha.')
para('Você pode utilizar um formulário de cadastro, uma comunidade ou um canal apropriado de comunicação.')
box([[('Para o WhatsApp, ',DEEP),'obtenha a autorização necessária dos participantes antes de enviar mensagens promocionais. Explique quem enviará as mensagens, a finalidade e como deixar de recebê-las.']])
h2('Como estruturar')
for i,s_ in enumerate(['defina quais ofertas estarão disponíveis antecipadamente.','crie uma página ou formulário simples de inscrição.','divulgue o acesso antecipado aos interessados.','apresente as condições especiais na data prometida.','acompanhe o interesse e encaminhe os contatos para atendimento.'],1):
    rich([(f'Passo {i}: ',BLUE),s_])
h2('Exemplo de divulgação')
box(['“Estamos preparando condições especiais para a Black Friday. Quem participar da nossa lista VIP poderá conhecer as ofertas antecipadamente. Quer receber o convite?”'])
para('A condição oferecida deve ser verdadeira e estar disponível conforme o anunciado.',True)
pagebreak()

# 11
eyebrow('Etapa 4 · Plano de comunicação'); title('O que comunicar antes da Black Friday?')
para('Organize a comunicação em quatro momentos.')
for i,(n,d) in enumerate([('Preparação','Apresente a campanha, os produtos participantes e as principais informações.'),('Interesse','Mostre produtos, benefícios, aplicações, demonstrações e informações que ajudem na escolha.'),('Acesso antecipado','Envie as ofertas para os inscritos da lista VIP, conforme as condições anunciadas.'),('Campanha aberta','Divulgue os preços e condições para o público geral.')],1):
    rich([(f'Momento {i}. {n}: ',BLUE),d])
h2('Meu plano de comunicação')
table(['Momento','Data','Canal','O que vou mostrar'],[(('1. Preparação',),'','',''),(('2. Interesse',),'','',''),(('3. Acesso antecipado',),'','',''),(('4. Campanha aberta',),'','','')],[45,30,35,60])
checklist('16 a 20','Lista VIP e comunicação',['Escolhi o formato da lista VIP.','Preparei a página ou formulário de inscrição.','Organizei a comunicação antecipada.','Defini quais ofertas serão divulgadas primeiro.','Estruturei um atendimento para os contatos interessados.'],16)
rich([('Observação importante: ',),'a lista VIP pode ser feita sem grandes investimentos. O essencial é ter uma proposta clara e um processo organizado.'])
pagebreak()

# 12
eyebrow('Etapa 5 · Prepare o comercial'); title('Sua equipe sabe exatamente como atender durante a campanha?')
para('Com as ofertas definidas, é hora de preparar a operação.')
para('Uma campanha pode aumentar o volume de mensagens, solicitações de orçamento e dúvidas.')
para('A equipe precisa conhecer as condições da oferta e ter clareza sobre os próximos passos.')
h2('Defina cinco responsabilidades')
table(['Responsabilidade','Pergunta','Responsável'],[(('1. Atendimento inicial',),'Quem receberá os novos contatos?',''),(('2. Qualificação',),'Como descobrir o que cada interessado precisa?',''),(('3. Apresentação',),'Quem apresentará os produtos, serviços e condições?',''),(('4. Acompanhamento',),'Quem será responsável por retomar as conversas pendentes?',''),(('5. Fechamento',),'Como o cliente poderá concluir a compra ou contratação?','')],[45,80,45])
h2('Perguntas para a equipe')
bullets(['Quais ofertas estão disponíveis?','Quais condições de pagamento são aceitas?','Qual é o prazo de entrega?','Quais dúvidas são mais frequentes?','Quem assume um atendimento quando o responsável está ocupado?'])
pagebreak()

# 13
eyebrow('Etapa 5 · CRM e acompanhamento'); title('Organize as oportunidades para não perder o controle.')
para('Crie etapas simples no CRM ou em uma planilha. (CRM é o sistema onde a empresa registra cada contato e em que ponto da negociação ele está.)')
h2('Funil sugerido')
st_=['Novo interessado','Contato realizado','Necessidade identificada','Oferta apresentada','Aguardando decisão','Venda concluída ou oportunidade encerrada']
for i,s_ in enumerate(st_):
    p=para(after=0); run(p,f'{i+1}. ',True,BLUE); run(p,s_)
    if i<5: para('↓',color=MUTED,after=0)
h2('Todo contato deve ter, quando aplicável:')
bullets(['Nome.','Origem.','Produto ou serviço de interesse.','Responsável pelo atendimento.','Etapa atual.','Próxima ação.','Data do próximo contato.','Situação da venda.'])
h2('Rotina de acompanhamento')
para('Defina uma meta interna de tempo de resposta compatível com a equipe.')
para('Por exemplo, buscar iniciar o atendimento em até cinco minutos durante o horário de funcionamento, quando houver capacidade para isso.')
para('Também estabeleça uma cadência de acompanhamento para interessados que ainda estejam avaliando a compra. (Cadência é a frequência combinada dos contatos de retorno.)')
para('Evite mensagens repetitivas ou insistentes. Respeite pedidos para interromper o contato.',True)
checklist('21 a 25','Operação comercial',['Defini os responsáveis pelo atendimento.','Orientei a equipe sobre as ofertas.','Preparei o CRM ou a planilha de oportunidades.','Estabeleci um tempo de resposta como meta interna.','Organizei o acompanhamento das negociações.'],21)
pagebreak()

# 14
eyebrow('Etapa 6 · Divulgação'); title('Onde divulgar sua campanha?')
para('Escolha os canais considerando onde seus clientes estão e a capacidade da empresa para atender.')
for n,d in [('Instagram','Utilize Reels, Stories e publicações para apresentar os produtos, as condições e as vantagens.'),('WhatsApp','Utilize listas de interessados autorizados, conversas comerciais e atendimento individualizado.'),('E-mail','Comunique a campanha para públicos que podem receber esse tipo de mensagem, seguindo as regras aplicáveis.'),('Tráfego pago','Utilize anúncios para alcançar novos interessados ou públicos adequados à campanha.'),('Loja física ou atendimento presencial','Prepare a comunicação no ponto de venda e oriente a equipe.')]:
    box([n,d],bold_first=True)
h2('Como distribuir o investimento')
para('Comece definindo quanto pode investir sem comprometer o caixa.')
para('Observe o custo para gerar um interessado, o custo para adquirir um cliente e a margem que a venda oferece.')
para('Evite escolher o orçamento de mídia apenas com base na meta de faturamento.',True)
para('Um sinal de alerta: se o custo para conquistar um cliente fica maior que a margem que a primeira venda deixa, cada nova venda tira dinheiro do caixa.',color=MUTED)
pagebreak()

# 15
eyebrow('Etapa 6 · Cronograma Black Friday 2026'); title('Organize sua campanha por etapas.')
para('Black Friday 2026: sexta-feira, 27 de novembro.',color=MUTED)
cron=[('04 a 08 de novembro','Planejamento',['Levantar indicadores.','Definir metas.','Escolher ofertas.','Analisar margens.','Organizar responsáveis.']),
('09 a 15 de novembro','Preparação comercial',['Segmentar contatos.','Organizar o CRM.','Preparar lista VIP.','Produzir materiais de divulgação.','Treinar o time.']),
('16 a 22 de novembro','Aquecimento',['Divulgar a campanha.','Captar interessados.','Apresentar produtos.','Testar processos de atendimento.','Corrigir problemas operacionais.']),
('23 a 26 de novembro','Acesso antecipado',['Revisar condições.','Conferir estoque e agenda.','Liberar ofertas antecipadas, se previstas.','Acompanhar oportunidades.','Ajustar o atendimento.']),
('27 de novembro','Black Friday',['Executar a campanha.','Acompanhar os indicadores.','Monitorar mensagens e pedidos.','Conferir resultados por oferta.','Tomar decisões com base nos números.']),
('28 a 30 de novembro','Continuidade, caso prevista nas condições da campanha',['Encerrar ou manter as ofertas conforme o anunciado.','Concluir os atendimentos pendentes.','Confirmar pedidos e entregas.','Organizar as informações da operação.']),
('01 a 07 de dezembro','Pós-campanha',['Analisar resultados.','Avaliar margens.','Reunir a equipe.','Identificar melhorias.','Planejar oportunidades de relacionamento.'])]
table(['Período','Etapa','O que fazer'],[((d,),n,'\n'.join('• '+x for x in its)) for d,n,its in cron],[38,42,90])
checklist('26 a 30','Divulgação',['Defini os canais de divulgação.','Preparei as peças da campanha.','Estabeleci o orçamento de divulgação.','Montei um calendário de comunicação.','Testei os links, formulários, pagamentos e canais de atendimento.'],26)
pagebreak()

# 16
eyebrow('Etapa 7 · Execução'); title('Os números que você precisa acompanhar.')
para('Durante a campanha, estabeleça momentos para analisar os resultados com a equipe.')
ind=[('Interessados recebidos','Quantas pessoas entraram em contato?'),('Taxa de atendimento','Quantos interessados receberam atendimento?'),('Propostas enviadas','Quantas oportunidades chegaram à apresentação de uma oferta?'),('Conversão comercial','Quantas vendas foram realizadas em relação às oportunidades?'),('Ticket médio','Qual foi o valor médio das vendas?'),('Faturamento','Qual foi o valor total vendido?'),('Margem de contribuição','Quanto da receita sobrou após os custos e despesas variáveis?'),('Investimento em divulgação','Quanto foi investido para gerar a demanda?')]
table(['Indicador','Pergunta','Minha meta'],[((f'{i}. {n}',),q,'') for i,(n,q) in enumerate(ind,1)],[55,80,35])
pagebreak()

# 17
eyebrow('Etapa 7 · Painel do empresário'); title('Modelo de acompanhamento diário')
para('Data: ____/____/______')
table(['Indicador','Meta','Realizado'],[((x,),'','') for x in ['Interessados','Contatos atendidos','Propostas enviadas','Vendas','Faturamento','Ticket médio','Conversão','Margem de contribuição']],[80,45,45])
h2('Fórmulas úteis')
for a,b in [('Taxa de atendimento','contatos atendidos ÷ interessados × 100.'),('Conversão final','vendas ÷ interessados × 100.'),('Conversão de propostas','vendas ÷ propostas enviadas × 100.'),('Ticket médio','faturamento ÷ vendas.'),('Custo de aquisição por cliente','investimento atribuível à aquisição ÷ novos clientes adquiridos.'),('Margem de contribuição','receita − custos e despesas variáveis.')]:
    rich([(a,BLUE),' = '+b])
h2('O que fazer com os números?')
para('Se muitas pessoas estão interessadas, mas poucas recebem atendimento, verifique a capacidade operacional.')
para('Se muitas propostas são apresentadas, mas poucas são fechadas, analise as ofertas, as objeções e o processo comercial.')
para('Se o faturamento cresce, mas a margem diminui, revise a rentabilidade da campanha.')
checklist('31 a 35','Indicadores e execução',['Defini as métricas que vou acompanhar.','Preparei meu painel de resultados.','Estabeleci uma rotina de análise durante a campanha.','Defini responsáveis pelos indicadores.','Preparei ações de ajuste para situações de baixo desempenho.'],31)
pagebreak()

# 18
eyebrow('Etapa 8 · Pós-Black Friday'); title('O que fazer depois que a campanha terminar?')
para('Uma boa operação comercial continua acompanhando a experiência dos clientes após a venda.')
for i,(n,d) in enumerate([('Organize as entregas','Confira os pedidos, os prazos e as responsabilidades.'),('Acompanhe a satisfação','Verifique se os clientes receberam o que foi prometido.'),('Analise o desempenho das ofertas','Identifique os produtos e serviços mais vendidos e aqueles com melhores resultados financeiros.'),('Avalie o comercial','Analise o tempo de atendimento, a conversão e as negociações pendentes.'),('Aproveite os aprendizados','Registre os pontos que funcionaram e o que precisa melhorar na próxima campanha.')],1):
    box([f'{i}. {n}',d],bold_first=True)
para('Reunião de avaliação com a equipe: ____/____/______')
checklist('36 a 40','Pós-campanha',['Preparei o processo de entrega ou execução.','Defini como acompanhar a satisfação dos clientes.','Organizei o encerramento das oportunidades.','Programei a análise financeira da campanha.','Marquei uma reunião para avaliar os resultados com a equipe.'],36)
pagebreak()

# 19 consolidado
eyebrow('Checklist consolidado'); title('Seus 40 pontos de preparação')
para('Marque o quadrado quando o item estiver feito. Na coluna Pts, anote a nota do Raio-X (0, 1 ou 2).',color=MUTED)
allitems=[('Diagnóstico e metas',['Conheço meu faturamento atual.','Sei quantas vendas realizo por mês.','Conheço o ticket médio da empresa.','Sei minha taxa de conversão comercial.','Defini uma meta financeira para a campanha.']),
('Ofertas e lucratividade',['Escolhi os produtos ou serviços da campanha.','Analisei a procura e o potencial de venda.','Criei ofertas ou combinações complementares.','Calculei os custos e as margens.','Validei estoque, agenda e capacidade de entrega.']),
('Base de clientes',['Organizei minha base de clientes.','Identifiquei clientes inativos.','Separei propostas e orçamentos pendentes.','Segmentei os contatos por perfil de interesse.','Preparei abordagens personalizadas e adequadas às permissões de contato.']),
('Lista VIP e comunicação',['Escolhi o formato da lista VIP.','Preparei a página ou formulário de inscrição.','Organizei a comunicação antecipada.','Defini quais ofertas serão divulgadas primeiro.','Estruturei um atendimento para os contatos interessados.']),
('Operação comercial',['Defini os responsáveis pelo atendimento.','Orientei a equipe sobre as ofertas.','Preparei o CRM ou a planilha de oportunidades.','Estabeleci um tempo de resposta como meta interna.','Organizei o acompanhamento das negociações.']),
('Divulgação',['Defini os canais de divulgação.','Preparei as peças da campanha.','Estabeleci o orçamento de divulgação.','Montei um calendário de comunicação.','Testei os links, formulários, pagamentos e canais de atendimento.']),
('Indicadores',['Defini as métricas que vou acompanhar.','Preparei meu painel de resultados.','Estabeleci uma rotina de análise durante a campanha.','Defini responsáveis pelos indicadores.','Preparei ações de ajuste para situações de baixo desempenho.']),
('Pós-campanha',['Preparei o processo de entrega ou execução.','Defini como acompanhar a satisfação dos clientes.','Organizei o encerramento das oportunidades.','Programei a análise financeira da campanha.','Marquei uma reunião para avaliar os resultados com a equipe.'])]
rows=[]; n=1
t=doc.add_table(rows=0,cols=4); t.style='Table Grid'; cell_margins(t,1.4)
for bi,(area,its) in enumerate(allitems,1):
    r=t.add_row().cells; m=r[0].merge(r[3]); shade(m,'0A1123'); m.paragraphs[0].text=''
    run(m.paragraphs[0],f'{bi}. {area}',True,WHITE,10); run(m.paragraphs[0],f'   itens {n:02d} a {n+4:02d}   |   Pts',False,GREEN,8.5)
    for it in its:
        r=t.add_row().cells; run(r[0].paragraphs[0],'☐',size=12,color=BLUE); run(r[1].paragraphs[0],f'{n:02d}',True,BLUE); run(r[2].paragraphs[0],it,size=9.5); n+=1
fix_widths(t,[9,10,131,20])
pagebreak()

# 20 raio-x
eyebrow('Raio-X da Black Friday'); title('Descubra como está a preparação da sua empresa.')
para('Para cada um dos 40 itens, atribua uma pontuação:')
rich([('0 pontos: ',BLUE),'ainda não foi preparado.']); rich([('1 ponto: ',BLUE),'foi iniciado, mas precisa de ajustes.']); rich([('2 pontos: ',BLUE),'está preparado, conferido e documentado.'])
para('Cada área pode alcançar até 10 pontos. Pontuação máxima: 80 pontos.',True)
h2('Resultado do diagnóstico')
table(['Pontuação','Resultado','O que fazer'],[(('0 a 24 pontos',),'Estrutura inicial','Sua empresa ainda precisa preparar várias áreas importantes. Priorize ofertas, margens, atendimento e metas.'),(('25 a 49 pontos',),'Preparação em andamento','Sua operação já possui algumas definições. Identifique os blocos com menor pontuação e organize os próximos ajustes.'),(('50 a 64 pontos',),'Estrutura bem encaminhada','Boa parte da campanha está planejada. Revise os processos, os testes e as responsabilidades antes de começar.'),(('65 a 80 pontos',),'Preparação avançada','Sua empresa já possui uma estrutura de planejamento mais completa. Confira a capacidade operacional e acompanhe os resultados durante a campanha.')],[32,42,96])
para('A pontuação é uma ferramenta de autoavaliação, sem garantia de resultados.',color=MUTED,size=9.5)
h2('Quadro de avaliação')
t=table(['Área','Pontuação'],[(a,'____ /10') for a in ['Diagnóstico e metas','Ofertas e margens','Base de clientes','Lista VIP','Operação comercial','Divulgação','Indicadores','Pós-campanha']]+[(('Total',),('____ /80',))],[120,50])
for r in t.rows[1:]: r.cells[1].paragraphs[0].alignment=WD_ALIGN_PARAGRAPH.RIGHT
para('Pergunta final: qual das oito áreas mais precisa da sua atenção neste momento?',True)
para(L)
pagebreak()

# 21 modelos
eyebrow('Modelos prontos'); title('Copie, personalize e use.')
mods=[('Modelo 1. Convite para a lista VIP',None,['Estamos preparando condições especiais para a Black Friday da [empresa].','Vamos liberar algumas ofertas antecipadamente para quem se cadastrar na nossa lista VIP.','Quer receber as informações? Acesse [link] e faça sua inscrição.']),
('Modelo 2. Reativação de cliente','Para clientes que autorizaram receber esse tipo de comunicação:',['Oi, [nome]! Tudo bem?','Aqui é [atendente], da [empresa].','Estamos preparando algumas condições especiais para a Black Friday e lembrei de você.','Temos novidades que podem fazer sentido para o que você procura.','Gostaria de receber as informações?']),
('Modelo 3. Retomada de orçamento','Para contatos com comunicação permitida:',['Oi, [nome]! Tudo bem?','Passando para saber se você ainda tem interesse em [produto/serviço].','Vamos ter uma condição especial durante a Black Friday e achei interessante te avisar.','Posso te apresentar as informações?']),
('Modelo 4. Primeiro atendimento',None,['Olá, [nome]! Tudo bem?','Seja bem-vindo à [empresa].','Vi que você demonstrou interesse na nossa campanha de Black Friday.','Me conta uma coisa: qual produto ou serviço você está procurando?']),
('Modelo 5. Acompanhamento de proposta',None,['Oi, [nome]! Tudo bem?','Conseguiu analisar as informações que te enviei?','Caso tenha alguma dúvida sobre o produto, a condição ou a forma de pagamento, posso te ajudar por aqui.']),
('Modelo 6. Encerramento da campanha',None,['Oi, [nome]!','Passando para avisar que nossa campanha de Black Friday está chegando ao fim, conforme o prazo divulgado.','Se ainda quiser esclarecer alguma dúvida sobre a oferta que conversamos, estou à disposição.'])]
for tt,ctx,lines in mods:
    p=para(tt.upper(),True,BLUE,10,after=1)
    if ctx: para(ctx,color=DEEP,size=9.5,after=2)
    ls=lines[:]; ls[0]='“'+ls[0]; ls[-1]=ls[-1]+'”'
    box(ls)
rich([('Use a mensagem de encerramento somente quando o prazo informado for verdadeiro. ',),'Em todos os modelos, respeite as permissões, as preferências e os pedidos de descadastramento.'])
pagebreak()

# 22 plano
eyebrow('Plano de ação do empresário'); title('Transforme esse checklist em decisões práticas.')
para('Agora que você avaliou sua empresa, escolha as três prioridades que precisam ser resolvidas antes da campanha.')
for k in range(1,4):
    para(f'PRIORIDADE {k:02d}',True,BLUE,12,after=3)
    para('O que precisa ser feito?',True,after=1); para(L,after=4)
    para('Quem será o responsável?',True,after=1); para(L,after=4)
    para('Qual é o prazo?',True,after=1); para(L,after=8)
h2('Meu conselho final')
para('A Black Friday passa, mas a estrutura comercial da sua empresa continua.',True)
para('Aproveite a preparação da campanha para organizar processos que também poderão ajudar seu negócio nos próximos meses.')
para('Quando você conhece seus números, tem clareza das metas e organiza o atendimento, fica mais fácil identificar oportunidades de crescimento.')
p=para('Marcelo Alves',True,NAVY,13,after=0); para('CEO da Orbion Sales\nGestão e Estruturação Comercial',color=MUTED,after=2); para('@alvesmarcelobr',True,DEEP)
box([[('Quer conversar sobre a estrutura comercial da sua empresa?',)],['Me chame no Instagram com a palavra ',('RAIO-X',DEEP),'.']],fill='C7FCDA')
pagebreak()

# 23 notas
eyebrow('Notas importantes'); title('Cuidados para uma campanha correta')
for n,d in [('Cumprimento das ofertas','Anuncie somente preços, condições, prazos e estoques verdadeiros. O que foi divulgado precisa ser cumprido, como prevê o Código de Defesa do Consumidor. Não use descontos fictícios nem escassez artificial.'),('Proteção dos dados','Use os dados de clientes com uma base legal adequada, conforme a LGPD. Guarde as informações com segurança e atenda pedidos de acesso, correção ou exclusão.'),('Autorização para mensagens','Envie mensagens promocionais apenas para quem autorizou. No WhatsApp, siga a Política de Mensagens do WhatsApp Business e ofereça uma forma simples de deixar de receber.'),('Profissões regulamentadas','Clínicas, consultórios, escritórios e outras atividades com conselho profissional têm regras próprias de publicidade. Consulte o seu conselho antes de divulgar promoções.')]:
    box([n,d],bold_first=True)
h2('Referências para consulta')
for a,u in [('Procon-ES, orientações para a Black Friday de 2026','https://procon.es.gov.br/procon-es-orienta-consumidores-a-monitorar-precos-antes-da-black-friday'),('Código de Defesa do Consumidor','https://consumidor.gov.br/pages/conteudo/publico/102'),('Ministério da Justiça e Senacon, guia de direitos na Black Friday','https://www.gov.br/mj/pt-br/assuntos/noticias/ministerio-da-justica-lanca-guia-do-consumidor-para-a-black-friday'),('ANPD, orientações sobre legítimo interesse e LGPD','https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse'),('Política de Mensagens do WhatsApp Business','https://business.whatsapp.com/policy')]:
    p=para(after=3); run(p,a+'\n',True); run(p,u,color=BLUE,size=9)
para('Este material tem caráter educativo. Os números usados nos exemplos são ilustrativos e não representam resultados reais de nenhuma empresa. Os resultados de cada campanha dependem do mercado, da oferta e da execução. Verifique a aplicabilidade das regras ao segmento do seu negócio.',color=MUTED,size=9)
doc.core_properties.title='Black Friday de Dono'; doc.core_properties.author='Marcelo Alves | Orbion Sales'
doc.save(sys.argv[1]); print('ok')
