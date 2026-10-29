"""Modelo independente (Python puro) das regras principais, usado para conferir os resultados da planilha.

Ele NÃO lê fórmulas da planilha. Recebe os mesmos dados de entrada e calcula os resultados
esperados com a biblioteca padrão (datetime), para comparação com o recálculo do LibreOffice.
"""
import calendar
import datetime as dt

SIT = {"Rascunho": 1, "Solicitada": 2, "Aprovada": 3, "Em gozo": 4, "Concluída": 5, "Cancelada": 6}
DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
ESPECIAIS = {"Doméstico (LC 150/2015)", "Intermitente", "Outro regime especial"}


def add_months(d, m):
    y, mo = divmod(d.month - 1 + m, 12)
    y += d.year
    mo += 1
    last = calendar.monthrange(y, mo)[1]
    return dt.date(y, mo, min(d.day, last))


def aniv(base, months):
    """Aniversário: mesmo dia; se o mês não tem o dia (29/02), usa o dia seguinte ao último (01/03)."""
    e = add_months(base, months)
    return e + dt.timedelta(days=1) if e.day < base.day else e


def weekday_excel(d):
    """WEEKDAY tipo 1 do Excel: domingo = 1."""
    return (d.weekday() + 1) % 7 + 1


def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


class Modelo:
    def __init__(self, data, ref):
        self.d = data
        self.ref = ref
        self.func = {f["ID do vínculo"]: f for f in data.get("T_Func", [])}
        self.local = {l["Código da localidade"]: l for l in data.get("T_Local", [])}
        self.esc = {e["Código da escala"]: e for e in data.get("T_Escalas", [])}
        self.fer = data.get("T_Feriados", [])
        self.calrev = data.get("T_CalRev", [])
        self.desc = data.get("T_Desc", [])
        self.equipes = {(e.get("ID da empresa"), e.get("Equipe")): e for e in data.get("T_Equipes", [])}
        self.limite_padrao = data.get("params", {}).get("limite")
        self.prog = [dict(p) for p in data.get("T_Prog", [])]
        self.per = []
        for p in data.get("T_Per", []):
            p = dict(p)
            p["ID do período"] = f'{p["ID do vínculo"]}-P{p["Nº do período"]}'
            self.per.append(p)
        self.per_by_id = {p["ID do período"]: p for p in self.per}
        self._prog_basico()
        self._periodos()
        self._prog_validacao()

    # ---------------------------------------------------------- programação: término e efeitos
    def _prog_basico(self):
        for g in self.prog:
            ini, dias = g.get("Data de início"), num(g.get("Dias de gozo"))
            g["_fim"] = ini + dt.timedelta(days=dias - 1) if ini and dias and dias > 0 else None
            g["_S"] = SIT.get(g.get("Situação da programação"), 0)
            per = self.per_by_id.get(g.get("ID do período"))
            vok = g.get("ID do vínculo") in self.func and per is not None and per["ID do vínculo"] == g.get("ID do vínculo")
            g["_vok"] = vok
            efe = "NENHUM"
            if vok and g["_fim"]:
                efe = {2: "DEMANDA", 3: "RESERVA", 4: "RESERVA", 5: "CONSUMO"}.get(g["_S"], "NENHUM")
            g["_efeito"] = efe
            ab = num(g.get("Dias de abono")) or 0
            g["_abono"] = ab if ab > 0 and g.get("Situação do abono") in ("Solicitado", "Confirmado") else 0
            ea = "NENHUM"
            if g["_abono"] and vok:
                if efe == "DEMANDA":
                    ea = "DEMANDA"
                elif efe in ("RESERVA", "CONSUMO"):
                    ea = "CONSUMO" if g.get("Situação do abono") == "Confirmado" else "RESERVA"
            g["_efeito_abono"] = ea
            g["_ativa"] = 1 if g.get("ID do vínculo") in self.func and 2 <= g["_S"] <= 5 and g["_fim"] else 0
            g["_cap"] = 1 if g["_ativa"] and g["_S"] >= 3 else 0

    # ---------------------------------------------------------- períodos
    def _periodos(self):
        for p in self.per:
            f = self.func.get(p["ID do vínculo"])
            n = p["Nº do período"]
            adm = f["Data de admissão"]
            p["_ini_pad"] = aniv(adm, 12 * (n - 1))
            p["_fim_pad"] = aniv(adm, 12 * n) - dt.timedelta(days=1)
            ini = p.get("Início ajustado") or p["_ini_pad"]
            fim = p.get("Término ajustado") or p["_fim_pad"]
            p["_ini_aq"], p["_fim_aq"] = ini, fim
            p["_ini_conc"] = fim + dt.timedelta(days=1)
            if p.get("Início ajustado") or p.get("Término ajustado"):
                p["_fim_conc"] = aniv(fim + dt.timedelta(days=1), 12) - dt.timedelta(days=1)
            else:
                p["_fim_conc"] = aniv(adm, 12 * (n + 1)) - dt.timedelta(days=1)
            faltas = num(p.get("Faltas injustificadas conferidas"))
            tab = None
            if faltas is not None:
                tab = 30 if faltas <= 5 else 24 if faltas <= 14 else 18 if faltas <= 23 else 12 if faltas <= 32 else 0
            p["_tabela"] = tab
            esp = f.get("Regime contratual") in ESPECIAIS
            if num(p.get("Direito ajustado")) is not None:
                dir_ = p["Direito ajustado"]
            else:
                dir_ = None if esp else tab
            p["_dir"] = dir_
            pid, v = p["ID do período"], p["ID do vínculo"]
            gs = [g for g in self.prog if g.get("ID do período") == pid and g.get("ID do vínculo") == v]
            sm = lambda key, efe: sum(num(g.get(key)) or 0 for g in gs if g["_efeito"] == efe)
            sa = lambda efe: sum(g["_abono"] for g in gs if g["_efeito_abono"] == efe)
            p["_gozo_conf"] = (num(p.get("Gozo anterior à planilha")) or 0) + sm("Dias de gozo", "CONSUMO")
            p["_abono_conf"] = (num(p.get("Abono anterior à planilha")) or 0) + sa("CONSUMO")
            p["_gozo_res"] = sm("Dias de gozo", "RESERVA")
            p["_abono_res"] = sa("RESERVA")
            p["_demanda"] = sm("Dias de gozo", "DEMANDA") + sa("DEMANDA")
            if dir_ is None:
                p["_sng"] = p["_sd"] = None
            else:
                p["_sng"] = dir_ - p["_gozo_conf"] - p["_abono_conf"]
                p["_sd"] = p["_sng"] - p["_gozo_res"] - p["_abono_res"]
            plano = [g for g in gs if g["_efeito"] in ("DEMANDA", "RESERVA", "CONSUMO")]
            hist_p = num(p.get("Parcelas anteriores à planilha")) or 0
            p["_parcelas"] = hist_p + len([g for g in plano if g["_efeito"] != "DEMANDA"])
            nplan = hist_p + len(plano)
            n14 = len([g for g in plano if g["Dias de gozo"] >= 14]) + (1 if (num(p.get("Maior parcela anterior")) or 0) >= 14 else 0)
            n5 = len([g for g in plano if g["Dias de gozo"] < 5])
            if hist_p > 1 and num(p.get("Maior parcela anterior")) is not None:
                if (num(p.get("Gozo anterior à planilha")) or 0) - p["Maior parcela anterior"] < 5 * (hist_p - 1):
                    n5 += 1
            if dir_ is None:
                rest = None
            else:
                rest = dir_ - p["_gozo_conf"] - p["_gozo_res"] - p["_abono_conf"] - p["_abono_res"] - p["_demanda"]
            p["_rest"] = rest
            p["_frac"] = self._frac(dir_, nplan, rest, n5, n14)
            p["_fracionado"] = 1 if rest is not None and (nplan >= 2 or (nplan == 1 and rest > 0)) else 0
            abono_qtd = len([g for g in plano if g["_abono"] > 0]) + (1 if (num(p.get("Abono anterior à planilha")) or 0) > 0 else 0)
            abono_tot = p["_abono_conf"] + p["_abono_res"] + sa("DEMANDA")
            p["_abono_qtd"] = abono_qtd
            p["_abono_exc"] = 1 if dir_ is not None and abono_tot > dir_ // 3 else 0
            p["_dias_fim"] = (p["_fim_conc"] - self.ref).days
            p["_ult_ini"] = p["_fim_conc"] - dt.timedelta(days=p["_sd"] - 1) if p["_sd"] and p["_sd"] > 0 else None

    @staticmethod
    def _frac(dir_, n, rest, n5, n14):
        if dir_ is None or n == 0:
            return 0
        if n > 3:
            return 31
        if rest < 0:
            return 32
        if n == 1:
            if rest == 0:
                return 10
            if n5 > 0:
                return 33
            if n14 == 0:
                return 36 if rest < 14 else 21
            return 38 if rest < 5 else 22
        if n5 > 0:
            return 33
        if n14 == 0:
            if rest == 0:
                return 34
            if n == 3:
                return 35
            return 36 if rest < 14 else 21
        if rest == 0:
            return 11
        if n == 3:
            return 37
        return 38 if rest < 5 else 22

    # ---------------------------------------------------------- feriados, escala e conflitos
    def feriado(self, d, uf, loc):
        c = 0
        for f in self.fer:
            if f.get("Data") != d:
                continue
            a = f.get("Abrangência")
            if a == "Nacional" or (a == "Estadual" and uf and f.get("UF") == uf) or (
                    a == "Municipal" and loc and f.get("Código da localidade") == loc):
                c += 1
        return c

    def _prog_validacao(self):
        for g in self.prog:
            f = self.func.get(g.get("ID do vínculo"))
            g["_vedado"] = None
            g["_retorno"] = None
            g["_conflito"] = 0
            if not f or not g["_fim"]:
                continue
            loc = f.get("Localidade de trabalho")
            uf = self.local.get(loc, {}).get("UF")
            esc = self.esc.get(f.get("Escala ou jornada"), {})
            ini = g["Data de início"]
            if 1 <= g["_S"] <= 3:
                fer = sum(self.feriado(ini + dt.timedelta(days=k), uf, loc) for k in (1, 2))
                dsr = DIAS.index(esc["Dia do DSR"]) + 1 if esc.get("Dia do DSR") else 0
                folga = DIAS.index(esc["Folga adicional fixa"]) + 1 if esc.get("Folga adicional fixa") else 0
                ved = 0
                if esc.get("Tipo") == "Variável":
                    ds = [x["Data de descanso"] for x in self.desc if x.get("ID do vínculo") == g["ID do vínculo"]]
                    ved = 1 if any(ini + dt.timedelta(days=1) <= x <= ini + dt.timedelta(days=2) for x in ds) else 0
                elif dsr:
                    wd = [weekday_excel(ini + dt.timedelta(days=k)) for k in (1, 2)]
                    ved = 1 if dsr in wd or (esc.get("Folga adicional conta na vedação") == "Sim" and folga and folga in wd) else 0
                g["_vedado"] = 1 if fer > 0 or ved else 0
            # retorno: primeiro dia de trabalho depois do término, pela máscara da escala fixa
            if 1 <= g["_S"] <= 4 and esc.get("Tipo") == "Fixa" and esc.get("Dia do DSR"):
                off = {DIAS.index(esc["Dia do DSR"]) + 1}
                if esc.get("Folga adicional fixa"):
                    off.add(DIAS.index(esc["Folga adicional fixa"]) + 1)
                d = g["_fim"] + dt.timedelta(days=1)
                while weekday_excel(d) in off:
                    d += dt.timedelta(days=1)
                anos = {ini.year, (g["_fim"] + dt.timedelta(days=1)).year}
                rev = all(any(c.get("Ano") == y and c.get("Código da localidade") == loc and c.get("Calendário revisado") == "Sim"
                              for c in self.calrev) for y in anos)
                if not rev:
                    g["_retorno"] = "Calendário incompleto"
                elif self.feriado(d, uf, loc):
                    g["_retorno"] = "Conferir escala (feriado no retorno)"
                else:
                    g["_retorno"] = d
        # conflito de equipe por sobreposição real de datas
        for g in self.prog:
            f = self.func.get(g.get("ID do vínculo"))
            if not g["_ativa"] or not f or not f.get("Equipe"):
                continue
            key = (f["ID da empresa"], f["Equipe"])
            eq = self.equipes.get(key, {})
            lim = num(eq.get("Limite interno de ausências simultâneas"))
            if lim is None:
                lim = num(self.limite_padrao)
            g["_limite"] = lim
            if lim is None:
                continue
            mesma = [h for h in self.prog if h["_cap"] and self.func.get(h.get("ID do vínculo"), {}).get("ID da empresa") == key[0]
                     and self.func.get(h.get("ID do vínculo"), {}).get("Equipe") == key[1]]
            dias = [g["Data de início"] + dt.timedelta(days=k) for k in range((g["_fim"] - g["Data de início"]).days + 1)]
            maxc = max(sum(1 for h in mesma if h["Data de início"] <= d <= h["_fim"]) for d in dias)
            if g["_cap"]:
                g["_conflito"] = 1 if maxc > lim else 0
            else:
                g["_conflito"] = 2 if maxc + 1 > lim else 0
