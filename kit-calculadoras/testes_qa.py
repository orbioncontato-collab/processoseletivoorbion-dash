# -*- coding: utf-8 -*-
"""
Testes funcionais do Kit de 12 Calculadoras.

Para cada cenário, altera as entradas de uma aba, recalcula o arquivo no
LibreOffice (motor de cálculo real) e confere status, resultados e ausência de
erros (#DIV/0!, #VALUE!, #NAME?, #REF!...).

Uso:
    python testes_qa.py CAMINHO_DO_recalc.py
"""
import json
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from openpyxl import load_workbook

sys.path.insert(0, str(Path(__file__).parent))
import gerar_kit as gk  # noqa: E402

RECALC = sys.argv[1] if len(sys.argv) > 1 else "recalc.py"

MP, MT = gk.MP, gk.MT
PRE = gk.MSG_PREENCHA
NUM = gk.MSG_NUM
OKMSG = "OK — cálculo realizado."
OCULTO = "Resultados ocultos até os dados serem corrigidos."


def comps4():
    fs = [(10, 30), (20, 120), (30, 210), (40, 300)]
    fx = sum(F * math.cos(math.radians(a)) for F, a in fs)
    fy = sum(F * math.sin(math.radians(a)) for F, a in fs)
    return fx, fy, math.hypot(fx, fy), math.degrees(math.atan2(fy, fx)) % 360


FX4, FY4, R4, A4 = comps4()
VAZIO = ""

# Cenários: aba -> lista de (descrição, entradas, status esperado, resultados esperados)
CEN = {
    "01_FORCAS": [
        ("F1 vazia", {"E8": None}, PRE, {"L8": VAZIO, "L10": VAZIO}),
        ("texto em F1", {"E8": "abc"}, NUM, {"L10": VAZIO}),
        ("F1 negativa", {"E8": -5}, "Erro: a intensidade da força 1 não pode ser negativa.", {"L10": VAZIO}),
        ("par incompleto F2", {"E11": None}, "Erro: preencha intensidade e ângulo da força 2 juntos.", {"L10": VAZIO}),
        ("resultante nula", {"E11": 180}, "OK", {"L10": 0.0, "L11": VAZIO, "L12": "Direção indefinida"}),
        ("ângulo negativo", {"E9": -90, "E10": None, "E11": None}, "OK", {"L8": 0.0, "L9": -100.0, "L11": 270.0}),
        ("quatro forças", {"E8": 10, "E9": 30, "E10": 20, "E11": 120, "E12": 30, "E13": 210, "E14": 40, "E15": 300},
         "OK", {"L8": FX4, "L9": FY4, "L10": R4, "L11": A4}),
        ("valor extremo", {"E8": 1e9, "E9": 45, "E10": None, "E11": None}, "OK", {"L10": 1e9, "L11": 45.0}),
    ],
    "02_TENSAO": [
        ("área vazia", {"E9": None}, PRE, {"L8": VAZIO}),
        ("área zero", {"E9": 0}, "Erro: a área deve ser maior que zero.", {"L8": VAZIO, "L9": VAZIO}),
        ("texto na força", {"E8": "abc"}, NUM, {"L8": VAZIO}),
        ("força negativa", {"E8": -1}, "Erro: a força não pode ser negativa.", {"L8": VAZIO}),
        ("valores pequenos", {"E8": 1e-6, "E9": 1e-6}, "OK", {"L8": 1000.0}),
        ("valores grandes", {"E8": 1e6, "E9": 1e-3}, "OK", {"L8": 1e12}),
    ],
    "03_DEFORMACAO": [
        ("E zero", {"E11": 0}, "Erro: o módulo de elasticidade deve ser maior que zero.", {"L8": VAZIO}),
        ("comprimento zero", {"E9": 0}, "Erro: o comprimento deve ser maior que zero.", {"L8": VAZIO}),
        ("área vazia", {"E10": None}, PRE, {"L8": VAZIO}),
        ("E em MPa (aviso)", {"E11": 200000}, "OK", {"L8": 0.0005, "H19": "OK — cálculo realizado. " + gk.CALCS[2]["dica"][1]}),
        ("força zero", {"E8": 0}, "OK", {"L8": 0.0, "L9": 0.0}),
    ],
    "04_TORCAO": [
        ("opcionais vazios", {"E10": None, "E11": None}, "OK", {"L8": gk.REF["04_tau"], "L9": VAZIO, "L10": VAZIO}),
        ("só comprimento", {"E11": None}, "Erro: preencha comprimento e G juntos (ou deixe os dois vazios).", {"L8": VAZIO}),
        ("diâmetro zero", {"E9": 0}, "Erro: informe um diâmetro positivo.", {"L8": VAZIO}),
        ("G negativo", {"E11": -1}, "Erro: o módulo G deve ser maior que zero.", {"L8": VAZIO}),
        ("texto no G", {"E11": "abc"}, NUM, {"L8": VAZIO}),
    ],
    "05_POTENCIA_TORQUE": [
        ("modo inverso correto", {"E8": MP, "E10": None, "E11": 15.707963267948966}, "OK",
         {"L9": 100.0, "L8": 15.707963267948966, "L10": gk.REF["05_w"]}),
        ("troca de modo sem potência", {"E8": MP}, PRE, {"L8": VAZIO, "L9": VAZIO}),
        ("modo inverso com torque preenchido", {"E8": MP, "E11": 10}, "Erro: neste modo, deixe vazio o campo Torque.", {"L9": VAZIO}),
        ("modo direto com potência preenchida", {"E11": 10}, "Erro: neste modo, deixe vazio o campo Potência.", {"L8": VAZIO}),
        ("rotação zero", {"E9": 0}, "Erro: a rotação deve ser maior que zero.", {"L10": VAZIO}),
        ("modo vazio", {"E8": None}, "Selecione o modo de cálculo.", {"L8": VAZIO}),
        ("modo inválido", {"E8": "xyz"}, "Erro: escolha um modo válido na lista.", {"L8": VAZIO}),
        ("torque negativo", {"E10": -3}, "Erro: o torque não pode ser negativo.", {"L8": VAZIO}),
    ],
    "06_GASES_IDEAIS": [
        ("calcular pressão", {"E8": gk.GP, "E9": None, "E11": 1.2043280930847913}, "OK", {"L8": 101.325, "L10": 1.2043280930847913}),
        ("calcular volume", {"E8": gk.GV, "E10": None, "E11": 1.2043280930847913}, "OK", {"L9": 1.0}),
        ("calcular temperatura", {"E8": gk.GT, "E12": None, "E11": 1.2043280930847913}, "OK", {"L11": 20.0, "L12": 293.15}),
        ("incógnita preenchida", {"E8": gk.GP}, "Erro: para calcular a pressão, deixe vazio o campo Pressão.", {"L8": VAZIO}),
        ("conhecida faltando", {"E10": None}, PRE, {"L10": VAZIO}),
        ("temperatura abaixo do zero absoluto", {"E12": -300}, "Erro: a temperatura deve ser maior que -273,15 °C (zero absoluto).", {"L10": VAZIO}),
        ("R universal (aviso)", {"E13": 8.314}, "OK", {"H19": "OK — cálculo realizado. " + gk.CALCS[5]["dica"][1]}),
        ("pressão zero", {"E9": 0}, "Erro: a pressão absoluta deve ser maior que zero.", {"L10": VAZIO}),
    ],
    "07_RENDIMENTO": [
        ("W maior que Q", {"E9": 1200}, "Erro: o trabalho líquido deve ser menor que o calor fornecido (2ª lei).", {"L8": VAZIO}),
        ("W igual a Q", {"E9": 1000}, "Erro: o trabalho líquido deve ser menor que o calor fornecido (2ª lei).", {"L8": VAZIO}),
        ("Q zero", {"E8": 0}, "Erro: o calor fornecido deve ser maior que zero.", {"L8": VAZIO}),
        ("W zero", {"E9": 0}, "OK", {"L8": 0.0, "L9": 1000.0}),
        ("W negativo", {"E9": -1}, "Erro: o trabalho líquido não pode ser negativo.", {"L8": VAZIO}),
    ],
    "08_HIDROSTATICA": [
        ("sem pressão na superfície", {"E11": None}, "OK", {"L8": 19.62, "L10": VAZIO, "L11": 0.1962}),
        ("densidade negativa", {"E8": -1}, "Erro: a densidade deve ser maior que zero.", {"L8": VAZIO}),
        ("profundidade zero", {"E10": 0}, "OK", {"L8": 0.0, "L10": 101.325}),
        ("profundidade negativa", {"E10": -1}, "Erro: a profundidade não pode ser negativa.", {"L8": VAZIO}),
        ("p0 zero", {"E11": 0}, "Erro: a pressão na superfície deve ser maior que zero.", {"L8": VAZIO}),
    ],
    "09_VAZAO": [
        ("diâmetro zero", {"E8": 0}, "Erro: informe um diâmetro positivo.", {"L8": VAZIO}),
        ("velocidade zero", {"E9": 0}, "OK", {"L9": 0.0}),
        ("texto no diâmetro", {"E8": "abc"}, NUM, {"L8": VAZIO}),
        ("diâmetro em metros (aviso)", {"E8": 0.05}, "OK", {"H19": "OK — cálculo realizado. " + gk.CALCS[8]["dica"][1]}),
        ("diâmetro grande", {"E8": 5000, "E9": 3}, "OK", {"L9": math.pi * 25 / 4 * 3}),
    ],
    "10_REYNOLDS": [
        ("velocidade zero", {"E9": 0}, "OK", {"L8": 0.0, "L9": "Sem escoamento"}),
        ("Re = 2300", {"E9": 0.115}, "OK", {"L9": "Transição"}),
        ("Re = 4000", {"E9": 0.2}, "OK", {"L9": "Turbulento"}),
        ("viscosidade zero", {"E11": 0}, "Erro: a viscosidade dinâmica deve ser maior que zero.", {"L8": VAZIO}),
        ("viscosidade negativa", {"E11": -0.001}, "Erro: a viscosidade dinâmica deve ser maior que zero.", {"L8": VAZIO}),
        ("viscosidade em cP (aviso)", {"E11": 1}, "OK", {"L8": 2.0, "H19": "OK — cálculo realizado. " + gk.CALCS[9]["dica"][1]}),
    ],
    "11_PERDA_CARGA": [
        ("sem densidade", {"E13": None}, "OK", {"L8": gk.REF["11_hf"], "L9": VAZIO, "L10": VAZIO}),
        ("diâmetro zero", {"E10": 0}, "Erro: informe um diâmetro positivo.", {"L8": VAZIO}),
        ("fator zero", {"E8": 0}, "Erro: o fator de atrito deve ser maior que zero.", {"L8": VAZIO}),
        ("gravidade vazia", {"E12": None}, PRE, {"L8": VAZIO}),
        ("velocidade zero", {"E11": 0}, "OK", {"L8": 0.0, "L9": 0.0}),
    ],
    "12_CONDUCAO": [
        ("T2 maior que T1", {"E11": 20, "E12": 50}, "OK", {"L8": -480.0, "L9": 480.0, "L12": "Do lado 2 para o lado 1"}),
        ("temperaturas iguais", {"E12": 50}, "OK", {"L8": 0.0, "L12": "Sem transferência líquida"}),
        ("espessura zero", {"E10": 0}, "Erro: a espessura deve ser maior que zero.", {"L8": VAZIO}),
        ("temperaturas negativas", {"E11": -10, "E12": -30}, "OK", {"L8": 320.0}),
        ("abaixo do zero absoluto", {"E12": -300}, "Erro: T₂ deve ser maior que -273,15 °C (zero absoluto).", {"L8": VAZIO}),
        ("texto na temperatura", {"E11": "abc"}, NUM, {"L8": VAZIO}),
    ],
}


def recalc(path):
    out = subprocess.run([sys.executable, RECALC, str(path), "120"], capture_output=True, text=True)
    return json.loads(out.stdout)


def proximo(a, b):
    if isinstance(b, str):
        return (a or "") == b
    if not isinstance(a, (int, float)):
        return False
    return abs(a - b) <= max(1e-9, 1e-9 * abs(b))


def varrer_erros(wb):
    erros = []
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and c.value.startswith("#") and c.value.endswith(("!", "?", "A")):
                    erros.append(f"{ws.title}!{c.coordinate}={c.value}")
    return erros


def main():
    tmp = Path(tempfile.mkdtemp(prefix="kit_qa_"))
    base = gk.gerar(tmp)
    total = aprov = 0
    falhas = []
    rodadas = max(len(v) for v in CEN.values())

    # Rodada 0: arquivo original
    r0 = tmp / "r0.xlsx"
    shutil.copy(base, r0)
    res = recalc(r0)
    wb = load_workbook(r0, data_only=True)
    t = wb["TESTES"]
    st = [t.cell(r, 9).value for r in range(1, t.max_row + 1)]
    n_ap = sum(1 for s in st if s == "APROVADO")
    n_rp = sum(1 for s in st if s == "REPROVADO")
    print(f"Arquivo original: {res.get('total_formulas')} fórmulas, {res.get('total_errors')} erros; "
          f"aba TESTES: {n_ap} APROVADO, {n_rp} REPROVADO")
    total += 1
    if res.get("total_errors") == 0 and n_rp == 0 and n_ap == 50:
        aprov += 1
    else:
        falhas.append("arquivo original")
    for ws in wb.worksheets[2:14]:
        total += 1
        if ws["L18"].value == "OK" and ws["H4"].value == "Exemplo demonstrativo preenchido.":
            aprov += 1
        else:
            falhas.append(f"{ws.title}: exemplo inicial não está OK")

    # Hiperlinks
    wbf = load_workbook(base)
    nomes = set(wbf.sheetnames)
    n_links = 0
    for ws in wbf.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if c.hyperlink is not None:
                    n_links += 1
                    alvo = c.hyperlink.location.split("!")[0].strip("'")
                    total += 1
                    if alvo in nomes and c.hyperlink.target in (None, ""):
                        aprov += 1
                    else:
                        falhas.append(f"link quebrado {ws.title}!{c.coordinate} -> {c.hyperlink.location}")
    print(f"Hiperlinks internos verificados: {n_links}")

    for k in range(rodadas):
        wb = load_workbook(base)
        ativos = {}
        for aba, lista in CEN.items():
            if k < len(lista):
                desc, ent, _, _ = lista[k]
                for cel, v in ent.items():
                    wb[aba][cel].value = v
                ativos[aba] = lista[k]
        p = tmp / f"r{k + 1}.xlsx"
        wb.save(p)
        res = recalc(p)
        wv = load_workbook(p, data_only=True)
        erros = varrer_erros(wv)
        if res.get("total_errors") or erros:
            falhas.append(f"rodada {k + 1}: erros de fórmula {erros[:5]}")
        for aba, (desc, ent, st_esp, outs) in ativos.items():
            ws = wv[aba]
            ok = True
            motivo = []
            if ws["L18"].value != st_esp:
                ok = False
                motivo.append(f"status={ws['L18'].value!r}")
            if st_esp != "OK" and ws["H19"].value != OCULTO:
                ok = False
                motivo.append(f"H19={ws['H19'].value!r}")
            for cel, esp in outs.items():
                val = ws[cel].value
                if not proximo(val, esp):
                    ok = False
                    motivo.append(f"{cel}={val!r} (esperado {esp!r})")
            # Teste padrão deve virar "não aplicável"
            idx = [c["sheet"] for c in gk.CALCS].index(aba)
            linhas = [r for r in range(1, wv["TESTES"].max_row + 1)
                      if wv["TESTES"].cell(r, 1).value == gk.CALCS[idx]["num"]
                      and isinstance(wv["TESTES"].cell(r, 9).value, str)
                      and r < 45]
            for r in linhas:
                if wv["TESTES"].cell(r, 9).value != gk.NAO_APLIC:
                    ok = False
                    motivo.append(f"TESTES!I{r}={wv['TESTES'].cell(r, 9).value!r}")
            if ws["H4"].value != "Valores informados pelo usuário.":
                ok = False
                motivo.append("indicador de exemplo não mudou")
            total += 1
            if ok:
                aprov += 1
            else:
                falhas.append(f"{aba} [{desc}]: " + "; ".join(motivo))
        print(f"Rodada {k + 1}/{rodadas}: {len(ativos)} cenários, erros de fórmula: {len(erros)}")

    print(f"\nVERIFICAÇÕES: {total}  APROVADAS: {aprov}  FALHAS: {len(falhas)}")
    for f in falhas:
        print("  FALHA:", f)
    shutil.rmtree(tmp, ignore_errors=True)
    return 0 if not falhas else 1


if __name__ == "__main__":
    sys.exit(main())
