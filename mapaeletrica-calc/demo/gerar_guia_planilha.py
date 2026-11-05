#!/usr/bin/env python3
"""
Gera o guia visual em PDF da planilha MapaEletrica-Calc.xlsx.

As imagens vêm da própria planilha (com exemplos, com erro, com modo trocado e com valores digitados),
recalculada e desenhada pelo LibreOffice. As marcações numeradas são posicionadas lendo onde cada
texto ficou na página. Os passos dentro do Google Drive aparecem em texto, com o nome de cada menu.

Uso: python3 demo/gerar_guia_planilha.py caminho/para/recalc.py caminho/para/soffice.py
Saída: demo/Guia-Visual-MapaEletrica-Calc-Planilha.pdf
"""
import base64, html, io, os, re, shutil, subprocess, sys, tempfile
from openpyxl import load_workbook
from PIL import Image

RECALC, SOFFICE = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
XLSX = os.path.join(ROOT, 'planilha', 'MapaEletrica-Calc.xlsx')
OUT = os.path.join(HERE, 'Guia-Visual-MapaEletrica-Calc-Planilha.pdf')
DPI = 200
OHM = 'Ω'
TMP = tempfile.mkdtemp()


def find_row(ws, label, start=4):
    for r in range(start, ws.max_row + 1):
        if ws.cell(r, 1).value == label:
            return r
    raise KeyError(label)


def variant(name, changes):
    """Cria uma cópia da planilha com entradas alteradas, recalcula e exporta para PDF (uma página por aba)."""
    path = os.path.join(TMP, name + '.xlsx')
    wb = load_workbook(XLSX)
    for sheet, label, col, value in changes:
        ws = wb[sheet]
        ws.cell(find_row(ws, label), col).value = value
    for ws in wb.worksheets:
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.page_setup.orientation = 'portrait' if ws.title != 'Início' else 'landscape'
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 1
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.print_options.horizontalCentered = False
    wb.save(path)
    subprocess.run([sys.executable, RECALC, path, '90'], check=True, capture_output=True)
    subprocess.run([sys.executable, SOFFICE, '--headless', '--convert-to', 'pdf', '--outdir', TMP, path], check=True, capture_output=True, timeout=180)
    return os.path.join(TMP, name + '.pdf'), wb.sheetnames


class Page:
    """Uma página do PDF exportado: imagem + posição de cada palavra."""

    def __init__(self, pdf, index):
        out = subprocess.run(['pdftotext', '-bbox', '-f', str(index), '-l', str(index), pdf, '-'], capture_output=True, text=True).stdout
        pw, ph = re.search(r'<page width="([\d.]+)" height="([\d.]+)"', out).groups()
        self.pw, self.ph = float(pw), float(ph)
        self.words = [(float(a), float(b), float(c), float(d), html.unescape(w)) for a, b, c, d, w in
                      re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', out)]
        prefix = os.path.join(TMP, 'pg')
        subprocess.run(['pdftoppm', '-r', str(DPI), '-png', '-singlefile', '-f', str(index), '-l', str(index), pdf, prefix], check=True)
        self.img = Image.open(prefix + '.png').convert('RGB')
        self.sx = self.img.width / self.pw
        self.sy = self.img.height / self.ph

    def find(self, phrase, after=None, nth=0):
        """Caixa (x0, y0, x1, y1) de uma frase. `after` limita a busca abaixo de uma altura."""
        toks = phrase.split()
        hits = []
        for i in range(len(self.words) - len(toks) + 1):
            if all(self.words[i + k][4] == toks[k] for k in range(len(toks))):
                ws = self.words[i:i + len(toks)]
                box = (min(w[0] for w in ws), min(w[1] for w in ws), max(w[2] for w in ws), max(w[3] for w in ws))
                if after is None or box[1] > after:
                    hits.append(box)
        if len(hits) <= nth:
            raise KeyError(phrase)
        return hits[nth]

    def content_x(self):
        return min(w[0] for w in self.words), max(w[2] for w in self.words)


def band(pg, top, bottom, after=None, pad=2):
    """Faixa de largura total entre duas frases."""
    a = pg.find(top, after)
    b = pg.find(bottom, a[1] - 1)
    x0, x1 = pg.content_x()
    return (x0 - pad, a[1] - pad, x1 + pad, b[3] + pad)


def word(pg, phrase, after=None, pad=3, nth=0):
    a = pg.find(phrase, after, nth)
    return (a[0] - pad, a[1] - pad, a[2] + pad, a[3] + pad)


def figure(pg, crop, marks, cls=''):
    """Recorta a página e devolve HTML com a imagem e as marcações em %."""
    x0, y0, x1, y1 = crop
    box = (int(x0 * pg.sx), int(y0 * pg.sy), int(x1 * pg.sx), int(y1 * pg.sy))
    im = pg.img.crop(box)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    src = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    w, h = x1 - x0, y1 - y0
    mk = ''
    for n, m in enumerate(marks, 1):
        l = (m[0] - x0) / w * 100
        t = (m[1] - y0) / h * 100
        mk += '<div class="mk" style="left:{:.2f}%;top:{:.2f}%;width:{:.2f}%;height:{:.2f}%"><span>{}</span></div>'.format(
            l, t, (m[2] - m[0]) / w * 100, (m[3] - m[1]) / h * 100, n)
    return '<div class="fig {}"><img src="{}">{}</div>'.format(cls, src, mk)


def legend(items):
    return '<ol class="lg">' + ''.join('<li><span class="b">{}</span><div>{}</div></li>'.format(i, t) for i, t in enumerate(items, 1)) + '</ol>'


def page(kicker, title, intro, body):
    return ('<section class="pg"><p class="kick">{}</p><h2>{}</h2>{}{}<footer>MapaElétrica Calc | Guia visual da planilha</footer></section>'
            .format(kicker, title, '<p class="intro">{}</p>'.format(intro) if intro else '', body))


def menu(s):
    return '<span class="menu">{}</span>'.format(s)


def gsteps(items):
    return '<div class="gd">' + ''.join('<span class="num">{}</span><div>{}</div>'.format(i, t) for i, t in enumerate(items, 1)) + '</div>'


def crop_between(pg, top, bottom, after=None, pad=8):
    a = pg.find(top, after)
    b = pg.find(bottom, a[1] - 1)
    x0, x1 = pg.content_x()
    return (x0 - pad, a[1] - pad, x1 + pad, b[3] + pad)


def main():
    base, names = variant('base', [])
    err, _ = variant('erro', [('01 Lei de Ohm', 'Resistência', 3, 0)])
    modo, _ = variant('modo', [('01 Lei de Ohm', 'O que você quer calcular?', 3, 'Tensão (V)'), ('01 Lei de Ohm', 'Tensão', 3, None), ('01 Lei de Ohm', 'Corrente', 3, 2)])
    meus, _ = variant('meus', [('05 Divisor de Tensão', 'Tensão de entrada', 3, 5), ('05 Divisor de Tensão', 'Resistência R1', 3, 10),
                               ('05 Divisor de Tensão', 'Resistência R2', 3, 4.7)])
    idx = {n: i + 1 for i, n in enumerate(names)}

    # Aba Início
    pi = Page(base, idx['Início'])
    x0, x1 = pi.content_x()
    top = pi.find('MapaElétrica Calc')
    bot = pi.find('disjuntores')
    fig_home = figure(pi, (x0 - 8, top[1] - 8, x1 + 8, bot[3] + 8), [
        band(pi, 'COMO USAR', '6. Para imprimir'),
        band(pi, 'Casas decimais dos resultados', 'Casas decimais dos resultados'),
        band(pi, 'Legenda', 'Azul claro: títulos das seções'),
        band(pi, 'AS 12 CALCULADORAS', '12 Conversor'),
        band(pi, 'NO GOOGLE DRIVE', 'Dica:'),
    ])

    # Anatomia de uma aba (01 Lei de Ohm, exemplo)
    po = Page(base, idx['01 Lei de Ohm'])
    x0, x1 = po.content_x()
    t = po.find('MapaElétrica Calc |')
    b = po.find('Voltar ao Início')
    dados = po.find('DADOS DE ENTRADA')
    res = po.find('RESULTADOS')
    sit = po.find('Situação dos dados')
    fig_anat1 = figure(po, (x0 - 8, t[1] - 8, x1 + 8, sit[3] + 10), [
        band(po, 'MapaElétrica Calc |', 'Escolha o que deseja calcular'),
        band(po, 'DADOS DE ENTRADA', 'Resistência', after=dados[1] - 1),
        word(po, 'Valor no SI'),
        word(po, 'Exemplo', after=dados[1]),
        band(po, 'Situação dos dados', 'Situação dos dados'),
    ])
    fig_anat2 = figure(po, (x0 - 8, res[1] - 8, x1 + 8, b[3] + 8), [
        band(po, 'RESULTADOS', 'Potência dissipada', after=res[1] - 1),
        word(po, 'Valor interno'),
        band(po, 'MEMÓRIA DE CÁLCULO', 'P = 24 W'),
        band(po, 'EXPLICAÇÃO', 'Ferramenta educacional.'),
    ])

    # Seus valores (05 Divisor de Tensão)
    pm = Page(meus, idx['05 Divisor de Tensão'])
    d = pm.find('DADOS DE ENTRADA')
    crop = crop_between(pm, 'DADOS DE ENTRADA', 'Fração da entrada na saída')
    fig_meus = figure(pm, crop, [
        band(pm, 'Tensão de entrada', 'Resistência R2', after=d[1]),
        word(pm, 'Valor no SI'),
        band(pm, 'Situação dos dados', 'Situação dos dados'),
        band(pm, 'Tensão sobre R1', 'Tensão sobre R2 (saída)', after=pm.find('RESULTADOS')[1]),
    ])
    mt = pm.find('MEMÓRIA DE CÁLCULO')
    fig_meus_memo = figure(pm, crop_between(pm, 'MEMÓRIA DE CÁLCULO', 'Conferência'), [
        word(pm, 'Fórmula', after=mt[1]), word(pm, 'Substituição', after=mt[1]), word(pm, 'Resultado', after=mt[1])])

    # Erro
    pe = Page(err, idx['01 Lei de Ohm'])
    fig_err = figure(pe, crop_between(pe, 'DADOS DE ENTRADA', 'Potência dissipada'), [
        band(pe, 'Resistência', 'Resistência', after=pe.find('DADOS DE ENTRADA')[1]),
        band(pe, 'Situação dos dados', 'Situação dos dados'),
        band(pe, 'Corrente calculada', 'Potência dissipada'),
    ])

    # Modo
    pmo = Page(modo, idx['01 Lei de Ohm'])
    fig_modo = figure(pmo, crop_between(pmo, 'DADOS DE ENTRADA', 'Potência dissipada'), [
        band(pmo, 'O que você quer calcular?', 'O que você quer calcular?'),
        word(pmo, 'Este é o valor calculado: deixe em branco.'),
        band(pmo, 'Tensão calculada', 'Tensão calculada'),
    ])

    css = open(os.path.join(HERE, 'guia.css'), encoding='utf-8').read()
    H = ['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>', css, '</style></head><body>']
    H.append('<section class="cover"><div><p class="kick light">Guia visual</p><h1>MapaElétrica Calc</h1><p class="sub">Versão em planilha para o Google Drive</p>'
             '<p class="cv">Como subir o arquivo, abrir no Planilhas Google, preencher, ler o resultado e conferir a resolução.</p>'
             '<ul class="toc"><li>1. Subir no Google Drive</li><li>2. Abrir e converter</li><li>3. A aba Início</li><li>4. Como é uma aba de calculadora</li>'
             '<li>5. Preencher com os seus valores</li><li>6. Escolher o modo</li><li>7. Quando algo está errado</li><li>8. Imprimir e salvar PDF</li><li>9. Dicas e cuidados</li></ul></div></section>')

    H.append(page('Passos 1 e 2', 'Subir no Google Drive e abrir', 'Você só precisa de uma conta Google. O arquivo se chama <b>MapaEletrica-Calc.xlsx</b>.',
                  '<h3>Passo 1. Subir o arquivo</h3>' + gsteps([
                      'Abra <b>drive.google.com</b> no computador.',
                      'Clique em ' + menu('+ Novo') + ' e depois em ' + menu('Upload de arquivo') + '. Escolha o MapaEletrica-Calc.xlsx.',
                      'No celular, use o app Google Drive: toque em ' + menu('+') + ' e em ' + menu('Upload') + '.']) +
                  '<h3>Passo 2. Abrir e converter para Planilhas Google</h3>' + gsteps([
                      'Clique com o botão direito no arquivo e escolha ' + menu('Abrir com') + ' > ' + menu('Planilhas Google') + '.',
                      'No topo aparece o aviso de arquivo do Excel. Use ' + menu('Arquivo') + ' > ' + menu('Salvar como Planilhas Google') +
                      ' (ou o botão ' + menu('Converter para Planilhas Google') + '). A versão convertida é a recomendada: os links entre abas e as listas de opções funcionam melhor.',
                      'Confira a localidade: ' + menu('Arquivo') + ' > ' + menu('Configurações') + ' > ' + menu('Localidade: Brasil') + '. Assim a vírgula funciona como separador decimal.',
                      'Faça uma cópia de segurança: ' + menu('Arquivo') + ' > ' + menu('Fazer uma cópia') + '. Assim você sempre tem o original com os exemplos.']) +
                  '<p class="tip"><b>Sobre as imagens deste guia:</b> elas mostram o conteúdo real da planilha. No Google Planilhas o visual é o mesmo, com as linhas de grade, os nomes das abas no rodapé e a barra de menus do Google em volta.</p>'))

    H.append(page('Passo 3', 'A aba Início', 'É a primeira aba. Ela explica o uso e leva para as calculadoras.',
                  fig_home + legend([
                      '<b>Como usar</b>, em seis passos.',
                      '<b>Casas decimais</b>: escolha 2, 4 ou 6. Vale para todas as abas e só muda a exibição.',
                      '<b>Legenda de cores</b>: amarelo é onde você digita, verde é resultado.',
                      '<b>As 12 calculadoras</b>: clique no nome para ir direto à aba. Também dá para usar as abas no rodapé.',
                      '<b>No Google Drive</b>: lembretes de conversão, localidade e cópia.'])))

    H.append(page('Passo 4', 'Como é uma aba de calculadora', 'As 12 abas seguem a mesma ordem, de cima para baixo. Esta é a Lei de Ohm com o exemplo já preenchido.',
                  fig_anat1 + legend([
                      '<b>Título</b>, objetivo e orientação de preenchimento.',
                      '<b>Dados de entrada</b>: digite nas células amarelas da coluna "Valor" e escolha a unidade na lista ao lado.',
                      '<b>Valor no SI</b>: a planilha converte sozinha (ex.: 1 kΩ vira 1000 Ω).',
                      '<b>Exemplo</b>: os valores do caso de exemplo, para comparar.',
                      '<b>Situação dos dados</b>: verde com "Dados válidos" ou vermelho com o que corrigir.']) +
                  fig_anat2 + legend([
                      '<b>Resultados</b>, nas células verdes. Não digite nelas.',
                      '<b>Valor interno</b>: o número completo, sem arredondar.',
                      '<b>Memória de cálculo</b>: fórmula, substituição dos números e resultado de cada etapa.',
                      '<b>Explicação</b>, hipóteses do modelo e aviso educacional.'])))

    H.append(page('Passo 5', 'Preencher com os seus valores', 'Apague o exemplo e digite os seus números. O resultado muda na hora, sem botão de calcular. Aqui: 5 V, R1 = 10 kΩ e R2 = 4,7 kΩ.',
                  fig_meus + legend([
                      '<b>Seus valores</b> nas células amarelas, com a unidade escolhida na lista (V, kΩ...).',
                      '<b>Valor no SI</b>: 10 kΩ aparece como 10000 Ω.',
                      '<b>Dados válidos</b>: tudo certo para calcular.',
                      '<b>Resultados</b> atualizados.']) +
                  fig_meus_memo + legend(['<b>Fórmula</b> geral da etapa.', '<b>Substituição</b> com os seus números (no SI).', '<b>Resultado</b> da etapa.'])))

    H.append(page('Passo 6', 'Escolher o modo', 'Algumas abas têm uma lista para escolher o que calcular. Na Lei de Ohm, ao escolher "Tensão (V)", você informa corrente e resistência.',
                  fig_modo + legend([
                      'Clique na célula amarela e escolha o <b>modo</b> na lista.',
                      'A planilha avisa qual campo <b>fica em branco</b>, porque é o valor calculado.',
                      '<b>Resultado</b> do modo escolhido: 2 A × 6 Ω = 12 V.']) +
                  '<p class="tip"><b>Abas com modo ou lista de opções:</b> Lei de Ohm, Potência CC, Resistores (série ou paralelo), Frequência, Reatância, Impedância (RL, RC, RLC), Monofásica e Trifásica (natureza da carga e tipo de ligação) e Conversor (unidades).</p>'))

    H.append(page('Passo 7', 'Quando algo está errado', 'Se faltar um dado ou um valor não fizer sentido, a planilha não mostra resultado. Ela explica o que corrigir. Aqui a resistência foi digitada como zero.',
                  fig_err + legend([
                      'O <b>valor com problema</b>: resistência igual a zero.',
                      'A <b>Situação dos dados</b> fica vermelha e explica a correção.',
                      'Os <b>resultados ficam em branco</b> até você corrigir, para não mostrar um número errado.']) +
                  '<p class="tip"><b>Mensagens comuns:</b> campo vazio, texto no lugar de número, valor negativo onde não cabe, fator de potência fora de 0 a 1, mais de 24 horas por dia e unidades de grandezas diferentes no Conversor. Se aparecer "digite apenas números" mesmo com um número certo, confira a localidade (Passo 2).</p>'))

    H.append(page('Passo 8', 'Imprimir e salvar PDF', 'Cada aba é um relatório completo: dados, resultados, memória de cálculo e hipóteses.',
                  gsteps([
                      'Abra a aba da calculadora que você usou.',
                      'Vá em ' + menu('Arquivo') + ' > ' + menu('Imprimir') + '.',
                      'Em ' + menu('Imprimir') + ', escolha ' + menu('Página atual') + ' para levar só essa calculadora.',
                      'Para gerar o arquivo, use ' + menu('Arquivo') + ' > ' + menu('Fazer download') + ' > ' + menu('Documento PDF') + ', ou escolha "Salvar como PDF" na impressão.']) +
                  '<h3>Passo 9. Dicas e cuidados</h3><ul class="steps" style="padding-left:18px">'
                  '<li>Digite só nas células <b>amarelas</b>. As verdes e as da memória de cálculo são fórmulas.</li>'
                  '<li>Não altere a aba <b>Unidades</b>: ela guarda os fatores de conversão usados por todas as abas.</li>'
                  '<li>Para voltar ao exemplo de uma aba, use a cópia de segurança ou a coluna "Exemplo".</li>'
                  '<li>Use vírgula para decimais (0,5). Notação científica também funciona (4,7E-6).</li>'
                  '<li>Na aba Resistores, linhas em branco são ignoradas. Preencha de 2 a 10 resistores.</li></ul>'
                  '<h3>Aviso importante</h3><p class="intro">O MapaElétrica Calc é uma ferramenta educacional para estudar e conferir exercícios. As fórmulas usam modelos ideais. Os resultados não substituem normas técnicas, projetos, medições nem profissionais habilitados, e não devem ser usados para dimensionar condutores, disjuntores ou proteções.</p>'))

    H.append('</body></html>')
    tmp_html = os.path.join(TMP, 'guia.html')
    with open(tmp_html, 'w', encoding='utf-8') as f:
        f.write(''.join(H))
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          "await p.goto('file://'+process.argv[1]);await p.waitForTimeout(400);"
          "await p.pdf({path:process.argv[2],format:'A4',printBackground:true,margin:{top:'0',bottom:'0',left:'0',right:'0'}});await b.close();})()"
          ".catch(e=>{console.error(e);process.exit(1)})")
    subprocess.run(['node', '-e', js, tmp_html, OUT], check=True)
    shutil.rmtree(TMP, ignore_errors=True)
    print('Guia gerado:', os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()
