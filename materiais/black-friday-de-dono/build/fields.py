"""Adiciona campos clicáveis (checkbox e texto) ao PDF base.
Uso: python3 fields.py base.pdf campos.json saida.pdf"""
import json, sys, pymupdf
base, fj, out = sys.argv[1:4]
doc = pymupdf.open(base)
PX = 0.75  # 1px CSS = 0.75pt
NAVY=(10/255,17/255,35/255); GREEN=(116/255,250/255,165/255); WHITE=(1,1,1)
for f in json.load(open(fj)):
    page = doc[f['page']]
    x, y, w, h = f['x']*PX, f['y']*PX, f['w']*PX, f['h']*PX
    wd = pymupdf.Widget()
    wd.field_name = f['name']
    wd.border_width = 0
    wd.border_color = None
    wd.fill_color = None
    if f['kind'] == 'check':
        wd.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
        wd.rect = pymupdf.Rect(x+0.6, y+0.6, x+w-0.6, y+h-0.6)
        wd.text_color = GREEN if f['dark'] else NAVY
        wd.field_value = False
    else:
        wd.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
        top = y - (4 if not f['box'] else 0)
        wd.rect = pymupdf.Rect(x, top, x+w, y+h-1)
        wd.text_font = 'Helv'
        wd.text_fontsize = 0 if f['box'] else 9.5
        wd.text_color = WHITE if f['dark'] else NAVY
        if f['box']:
            wd.text_format = pymupdf.TEXT_ALIGN_CENTER if hasattr(pymupdf,'TEXT_ALIGN_CENTER') else 1
            wd.field_flags = 0
    page.add_widget(wd)
doc.set_metadata({'title':'Black Friday de Dono | O Checklist Comercial para Preparar sua Empresa e Vender Mais',
                  'author':'Marcelo Alves | Orbion Sales','subject':'Checklist comercial para a Black Friday',
                  'keywords':'Black Friday, checklist comercial, vendas, CRM, gestão comercial'})
doc.save(out, garbage=3, deflate=True)
print('campos:', sum(len(list(p.widgets())) for p in doc))
