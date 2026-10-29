"""Gera as planilhas finais, roda os testes e grava o relatório.

Uso:
    python3 gerar_tudo.py            # gera limpa, demonstração, testes e volume
    python3 gerar_tudo.py --rapido   # pula o teste de volume
Requisitos: Python 3.10+, xlsxwriter, openpyxl e LibreOffice (soffice) no PATH.
"""
import json
import re
import shutil
import sys
import tempfile
import time
import zipfile
from pathlib import Path

import comum as K
import construir
import dados
import dados_teste
import dados_volume
import leitura
import recalcular
import verificar

AQUI = Path(__file__).resolve().parent
SAIDA = AQUI.parent / "entregaveis"
TMP = Path(tempfile.mkdtemp(prefix="ferias-"))


def print_area_dinamica(path, builder):
    """Troca a área de impressão fixa das abas de dados por uma área que acompanha as linhas preenchidas."""
    order = list(builder.ws.keys())
    with zipfile.ZipFile(path) as z:
        items = {n: z.read(n) for n in z.namelist()}
    wbx = items["xl/workbook.xml"].decode("utf8")
    for sheet, (t, last_vis) in builder.print_areas.items():
        sid = order.index(sheet)
        key = t.cols[0].h
        rng = t.rng_abs(key)
        cnt = f'COUNTIF({rng},"?*")' if t.cols[0].kind != "in" else f"COUNTA({rng})"
        ncols = last_vis - t.c0 + 1
        hdr = f"{K.q(sheet)}!${construir.xl_col_to_name(t.c0)}${t.hdr + 1}"
        dyn = f"OFFSET({hdr},0,0,MAX(2,{cnt}+1),{ncols})".replace("&", "&amp;").replace('"', "&quot;")
        pat = re.compile(r'(<definedName name="_xlnm\.Print_Area" localSheetId="%d">)([^<]*)(</definedName>)' % sid)
        wbx, n = pat.subn(lambda m: m.group(1) + dyn + m.group(3), wbx)
        assert n == 1, sheet
    items["xl/workbook.xml"] = wbx.encode("utf8")
    tmp = str(path) + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for n, b in items.items():
            z.writestr(n, b)
    shutil.move(tmp, path)


def gerar_final(nome, data, ref):
    """Duas passagens: gera, recalcula no LibreOffice, grava de novo com os resultados como valores iniciais."""
    p1 = TMP / f"{nome}_p1.xlsx"
    b = construir.construir(data, p1)
    out, seg = recalcular.recalcular(p1, TMP / f"calc_{nome}")
    R = leitura.Resultado(out, b.tabs)
    res = {"recalculo_segundos": round(seg, 1), "erros_formula": R.erros()[:20], "qtd_erros": len(R.erros())}
    n, f, _ = verificar.comparar_modelo(R, data, ref)
    res["modelo"] = {"comparacoes": n, "divergencias": f[:30], "qtd_divergencias": len(f)}
    n, f = verificar.checar_vazias(R, data)
    res["linhas_vazias"] = {"celulas_conferidas": n, "falhas": f[:20], "qtd_falhas": len(f)}
    cache = R.valores_cache()
    final = SAIDA / f"{nome}.xlsx"
    b2 = construir.construir(data, final, cache)
    print_area_dinamica(final, b2)
    res["estrutura"] = verificar.checar_estrutura(final, b2.tabs)
    n, f = verificar.checar_protecao(final, b2.tabs)
    res["protecao"] = {"celulas_conferidas": n, "falhas": f[:20], "qtd_falhas": len(f)}
    if ref is not None:
        n, f, esp = verificar.checar_kpis(R, verificar.modelo.Modelo(data, ref))
        res["kpis"] = {"conferidos": n, "falhas": f, "esperado": esp}
    res["tamanho_mb"] = round(final.stat().st_size / 1e6, 2)
    return res, b2, R


def main():
    SAIDA.mkdir(exist_ok=True)
    rel = {"gerado_em": time.strftime("%d/%m/%Y %H:%M")}
    t0 = time.time()
    rel["limpa"], _, _ = gerar_final("Controle_de_Ferias", dados.dataset_limpo(), None)
    print("limpa ok", time.time() - t0, flush=True)
    rel["demonstracao"], bd, Rd = gerar_final("Controle_de_Ferias_Demonstracao", dados.dataset_demo(), K.DATA_REF_DEMO)
    print("demo ok", time.time() - t0, flush=True)
    # cenários de teste com valores esperados escritos à mão
    pt = TMP / "Teste_Cenarios.xlsx"
    ds = dados_teste.dataset()
    bt = construir.construir(ds, pt)
    out, seg = recalcular.recalcular(pt, TMP / "calc_teste")
    Rt = leitura.Resultado(out, bt.tabs)
    n1, f1, _ = verificar.comparar_modelo(Rt, ds, dados_teste.REF)
    n2, f2 = verificar.checar_esperado(Rt, ds)
    n3, f3 = verificar.checar_vazias(Rt, ds)
    rel["cenarios"] = {"erros_formula": len(Rt.erros()), "modelo": [n1, len(f1), f1[:20]], "esperado": [n2, len(f2), f2[:20]],
                       "vazias": [n3, len(f3)]}
    print("cenarios ok", time.time() - t0, flush=True)
    # atualização: muda uma situação na demonstração e confere se saldos e indicadores acompanham
    dv2 = dados.dataset_demo()
    for g in dv2["T_Prog"]:
        if g["ID da programação"] in ("PG0008", "PG0004"):
            g["Situação da programação"] = "Cancelada"
    pa = TMP / "Teste_Atualizacao.xlsx"
    ba = construir.construir(dv2, pa)
    out, seg = recalcular.recalcular(pa, TMP / "calc_atualizacao")
    Ra = leitura.Resultado(out, ba.tabs)
    na, fa, Ma = verificar.comparar_modelo(Ra, dv2, K.DATA_REF_DEMO)
    nk, fk, espk = verificar.checar_kpis(Ra, Ma)
    rel["atualizacao"] = {"alteracao": "PG0004 e PG0008 passam para Cancelada", "erros_formula": len(Ra.erros()),
                          "modelo": [na, len(fa), fa[:10]], "kpis": [nk, len(fk), fk, espk],
                          "kpis_antes": rel["demonstracao"].get("kpis", {}).get("esperado")}
    print("atualizacao ok", time.time() - t0, flush=True)
    if "--rapido" not in sys.argv:
        pv = TMP / "Teste_Volume.xlsx"
        dv = dados_volume.dataset()
        t1 = time.time()
        bv = construir.construir(dv, pv)
        tb = time.time() - t1
        out, seg = recalcular.recalcular(pv, TMP / "calc_volume")
        Rv = leitura.Resultado(out, bv.tabs)
        nv, fv, _ = verificar.comparar_modelo(Rv, dv, K.DATA_REF_DEMO)
        rel["volume"] = {"vinculos": len(dv["T_Func"]), "periodos": len(dv["T_Per"]), "programacoes": len(dv["T_Prog"]),
                         "providencias": len(dv["T_Prov"]), "ocorrencias": len(dv["T_Oc"]),
                         "geracao_segundos": round(tb, 1), "recalculo_libreoffice_segundos": round(seg, 1),
                         "erros_formula": len(Rv.erros()), "modelo": [nv, len(fv), fv[:20]],
                         "tamanho_mb": round(pv.stat().st_size / 1e6, 2)}
        print("volume ok", time.time() - t0, flush=True)
    (AQUI / "testes").mkdir(exist_ok=True)
    antigo = AQUI / "testes" / "resultado_testes.json"
    if "volume" not in rel and antigo.exists():
        prev = json.loads(antigo.read_text(encoding="utf8"))
        if "volume" in prev:
            rel["volume"] = prev["volume"]
            rel["volume"]["observacao"] = "resultado da última execução completa (gerar_tudo.py sem --rapido)"
    (AQUI / "testes" / "resultado_testes.json").write_text(json.dumps(rel, ensure_ascii=False, indent=1, default=str))
    print(json.dumps(rel, ensure_ascii=False, indent=1, default=str)[:6000])


if __name__ == "__main__":
    main()
