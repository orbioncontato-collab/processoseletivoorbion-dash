"""Massa de dados fictícia para o teste de volume (500 vínculos, vários períodos e parcelas por vínculo)."""
import datetime as dt
import random
import dados

D = dt.date


def dataset(n_vinc=500, seed=7):
    rnd = random.Random(seed)
    d = dados.dataset_demo()
    d["demo"] = False
    for k in ("T_Func", "T_Per", "T_Prog", "T_Prov", "T_Oc", "T_Est"):
        d[k] = []
    equipes = [(e["ID da empresa"], e["Equipe"], e["Setor"]) for e in d["T_Equipes"]]
    escalas = ["ADM-5X2", "COM-6X1", "6X1-SEG", "12X36"]
    sits = ["Concluída", "Aprovada", "Aprovada", "Solicitada", "Cancelada", "Rascunho", "Em gozo"]
    pid = 0
    for i in range(1, n_vinc + 1):
        emp, eq, setor = equipes[i % len(equipes)]
        loc = "SP-SAO" if emp == "E01" else "MG-BHE"
        est = "E01-MATRIZ" if emp == "E01" else "E02-UNI1"
        adm = D(2021, 1, 1) + dt.timedelta(days=rnd.randrange(0, 1900))
        sit = "Desligado" if i % 50 == 0 else ("Afastado" if i % 37 == 0 else "Ativo")
        vid = f"V{i:04d}"
        d["T_Func"].append({"ID do vínculo": vid, "ID da empresa": emp, "Estabelecimento": est, "Matrícula": f"{i:05d}",
                            "Nome": f"Pessoa fictícia {i:03d}", "Data de admissão": adm, "Setor": setor, "Equipe": eq,
                            "Localidade de trabalho": loc, "Escala ou jornada": escalas[i % 4], "Regime contratual": "CLT regra geral",
                            "Situação do vínculo": sit, "Data de desligamento": D(2026, 6, 30) if sit == "Desligado" else None,
                            "Responsável pelo controle": "Joana (DP)"})
        completos = max(1, (D(2026, 10, 15) - adm).days // 366)
        for n in range(max(1, completos - 1), completos + 2):
            faltas = rnd.choice([0, 0, 0, 1, 3, 8, 16])
            d["T_Per"].append({"ID do vínculo": vid, "Nº do período": n, "Faltas injustificadas conferidas": faltas,
                               "Situação da apuração do direito": rnd.choice(["Conferido", "Conferido", "Pendente"])})
            if len(d["T_Per"]) >= 1500:
                break
            # parcelas do período
            ini_aq = D(adm.year + n - 1, adm.month, min(adm.day, 28))
            base = ini_aq + dt.timedelta(days=380 + rnd.randrange(0, 200))
            npar = rnd.choice([1, 1, 2])
            for k in range(npar):
                if pid >= 2000:
                    break
                pid += 1
                s = rnd.choice(sits)
                dias = rnd.choice([30, 20, 15, 14, 10]) if npar == 1 else rnd.choice([15, 10, 14])
                ab = 10 if (npar == 1 and dias == 20) else None
                g = {"ID da programação": f"PG{pid:04d}", "ID do vínculo": vid, "ID do período": f"{vid}-P{n}",
                     "Situação da programação": s, "Data de início": base + dt.timedelta(days=40 * k), "Dias de gozo": dias,
                     "Dias de abono": ab, "Situação do abono": "Solicitado" if ab else None,
                     "Data da solicitação do abono": ini_aq + dt.timedelta(days=300) if ab else None,
                     "Concordância com fracionamento": "Sim" if npar > 1 else None, "Data da aprovação": base - dt.timedelta(days=45)}
                d["T_Prog"].append(g)
                if s in ("Aprovada", "Em gozo", "Concluída") and len(d["T_Prov"]) < 1500:
                    d["T_Prov"].append({"ID da programação": g["ID da programação"],
                                        "Data de entrega do aviso": g["Data de início"] - dt.timedelta(days=rnd.choice([35, 31, 20])),
                                        "Situação do pagamento": rnd.choice(["Previsto", "Agendado", "Confirmado"]),
                                        "Data do pagamento realizado": g["Data de início"] - dt.timedelta(days=3)})
        if i % 5 == 0 and len(d["T_Oc"]) < 300:
            d["T_Oc"].append({"ID da ocorrência": f"OC{len(d['T_Oc']) + 1:04d}", "ID do vínculo": vid,
                              "Tipo": "Afastamento por doença ou acidente (sem diagnóstico)",
                              "Início": adm + dt.timedelta(days=200), "Término": adm + dt.timedelta(days=215),
                              "Análise necessária": "Sim", "Situação da análise": rnd.choice(["Pendente", "Concluída"]),
                              "Efeito confirmado": "Sem efeito no direito", "Responsável": "Marcos (Conferência)",
                              "Data da conclusão": adm + dt.timedelta(days=230)})
    return d
