from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


# ═══════════════════════════════════════════════════════
#  1. CICLO OPERACIONAL & CONVERSÃO DE CAIXA
# ═══════════════════════════════════════════════════════

def calc_ciclos(pmre, pmrv, pmpc, vendas_anuais, estoque_medio,
                contas_receber, contas_pagar, cmv):
    co  = pmre + pmrv
    ccc = co - pmpc

    # Necessidade de Capital de Giro pelo método dos prazos
    ncg_prazos = (vendas_anuais / 365) * ccc if vendas_anuais else 0

    # Giro de Estoque
    giro_estoque = cmv / estoque_medio if estoque_medio else None

    # Ciclo financeiro em valor
    ciclo_financeiro_valor = (vendas_anuais / 365) * ccc if vendas_anuais else 0

    return {
        "pmre": pmre,
        "pmrv": pmrv,
        "pmpc": pmpc,
        "ciclo_operacional": round(co, 2),
        "ciclo_conversao_caixa": round(ccc, 2),
        "ncg": round(ncg_prazos, 2),
        "giro_estoque": round(giro_estoque, 2) if giro_estoque else None,
        "ciclo_financeiro_valor": round(ciclo_financeiro_valor, 2),
        "vendas_dia": round(vendas_anuais / 365, 2) if vendas_anuais else 0,
    }


# ═══════════════════════════════════════════════════════
#  2. ANÁLISE MARGINAL (A.L., CIMDR, CPM)
# ═══════════════════════════════════════════════════════

def calc_marginal(receita, custo_var_total, custo_fixo, qtd,
                  depreciacao, impostos_pct):
    mc_total  = receita - custo_var_total
    lucro_op  = mc_total - custo_fixo

    # Impostos sobre receita
    impostos  = receita * (impostos_pct / 100)
    lucro_liq = lucro_op - impostos - depreciacao

    # A.L. — Alavancagem Operacional
    al = mc_total / lucro_op if lucro_op != 0 else None

    # CIMDR breakdown (Custos, Impostos, Margem, Depreciação, Resultado)
    cimdr = {
        "custo_variavel": round(custo_var_total, 2),
        "impostos":       round(impostos, 2),
        "margem":         round(mc_total, 2),
        "depreciacao":    round(depreciacao, 2),
        "resultado":      round(lucro_liq, 2),
    }

    # C.P.M — Custo por Margem / Ponto de Equilíbrio quantidade
    mc_unit  = mc_total / qtd if qtd else 0
    cpm_pe   = custo_fixo / mc_unit if mc_unit != 0 else None

    # Margem operacional %
    margem_op_pct = (lucro_op / receita * 100) if receita else 0

    # Índice de MC %
    indice_mc = (mc_total / receita * 100) if receita else 0

    return {
        "al": round(al, 4) if al is not None else "∞",
        "cimdr": cimdr,
        "mc_unit": round(mc_unit, 2),
        "mc_total": round(mc_total, 2),
        "lucro_operacional": round(lucro_op, 2),
        "lucro_liquido": round(lucro_liq, 2),
        "cpm_pe_qtd": round(cpm_pe, 2) if cpm_pe is not None else "∞",
        "margem_op_pct": round(margem_op_pct, 2),
        "indice_mc_pct": round(indice_mc, 2),
        "receita": receita,
        "custo_fixo": custo_fixo,
        "custo_var_total": custo_var_total,
        "qtd": qtd,
    }


# ═══════════════════════════════════════════════════════
#  3. MARGEM DE CONTRIBUIÇÃO
# ═══════════════════════════════════════════════════════

def calc_margem(preco, cv_unit, cf_total, qtd, impostos_unit=0):
    mc_unit   = preco - cv_unit - impostos_unit
    mc_total  = mc_unit * qtd
    indice_mc = (mc_unit / preco * 100) if preco else 0

    # Receita total e lucratividade
    receita   = preco * qtd
    lucro     = mc_total - cf_total

    # Margem de segurança (acima do PE)
    pe_qtd    = cf_total / mc_unit if mc_unit != 0 else None
    ms_qtd    = qtd - pe_qtd if pe_qtd is not None else None
    ms_pct    = (ms_qtd / qtd * 100) if (ms_qtd is not None and qtd) else None

    return {
        "mc_unitaria":  round(mc_unit, 2),
        "mc_total":     round(mc_total, 2),
        "indice_mc_pct": round(indice_mc, 2),
        "receita_total": round(receita, 2),
        "lucro_liquido": round(lucro, 2),
        "pe_qtd":       round(pe_qtd, 2) if pe_qtd is not None else "∞",
        "margem_seg_qtd": round(ms_qtd, 2) if ms_qtd is not None else None,
        "margem_seg_pct": round(ms_pct, 2) if ms_pct is not None else None,
        "preco": preco, "cv_unit": cv_unit, "cf_total": cf_total, "qtd": qtd,
    }


# ═══════════════════════════════════════════════════════
#  4. PONTO DE EQUILÍBRIO (Contábil, Financeiro, Econômico)
# ═══════════════════════════════════════════════════════

def calc_equilibrio(cf, mc_unit, preco, depreciacao=0, lucro_desejado=0):
    # PE Contábil
    pe_c_qtd  = cf / mc_unit if mc_unit != 0 else None
    pe_c_val  = pe_c_qtd * preco if pe_c_qtd is not None else None

    # PE Financeiro (desconta depreciação — não é saída de caixa)
    cf_fin    = cf - depreciacao
    pe_f_qtd  = cf_fin / mc_unit if mc_unit != 0 else None
    pe_f_val  = pe_f_qtd * preco if pe_f_qtd is not None else None

    # PE Econômico (inclui lucro mínimo desejado)
    pe_e_qtd  = (cf + lucro_desejado) / mc_unit if mc_unit != 0 else None
    pe_e_val  = pe_e_qtd * preco if pe_e_qtd is not None else None

    def fmt(v): return round(v, 2) if v is not None else "∞"

    return {
        "pe_contabil_qtd":    fmt(pe_c_qtd),
        "pe_contabil_val":    fmt(pe_c_val),
        "pe_financeiro_qtd":  fmt(pe_f_qtd),
        "pe_financeiro_val":  fmt(pe_f_val),
        "pe_economico_qtd":   fmt(pe_e_qtd),
        "pe_economico_val":   fmt(pe_e_val),
        "mc_unit": mc_unit, "cf": cf,
        "depreciacao": depreciacao, "lucro_desejado": lucro_desejado,
    }


# ═══════════════════════════════════════════════════════
#  ROTAS
# ═══════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/ciclo", methods=["POST"])
def api_ciclo():
    d = request.json
    return jsonify(calc_ciclos(
        pmre           = float(d.get("pmre", 0)),
        pmrv           = float(d.get("pmrv", 0)),
        pmpc           = float(d.get("pmpc", 0)),
        vendas_anuais  = float(d.get("vendas_anuais", 0)),
        estoque_medio  = float(d.get("estoque_medio", 0)),
        contas_receber = float(d.get("contas_receber", 0)),
        contas_pagar   = float(d.get("contas_pagar", 0)),
        cmv            = float(d.get("cmv", 0)),
    ))


@app.route("/api/marginal", methods=["POST"])
def api_marginal():
    d = request.json
    return jsonify(calc_marginal(
        receita        = float(d.get("receita", 0)),
        custo_var_total= float(d.get("custo_variavel", 0)),
        custo_fixo     = float(d.get("custo_fixo", 0)),
        qtd            = float(d.get("quantidade", 1)),
        depreciacao    = float(d.get("depreciacao", 0)),
        impostos_pct   = float(d.get("impostos_pct", 0)),
    ))


@app.route("/api/margem", methods=["POST"])
def api_margem():
    d = request.json
    return jsonify(calc_margem(
        preco         = float(d.get("preco_venda", 0)),
        cv_unit       = float(d.get("custo_variavel_unit", 0)),
        cf_total      = float(d.get("custo_fixo_total", 0)),
        qtd           = float(d.get("quantidade", 0)),
        impostos_unit = float(d.get("impostos_unit", 0)),
    ))


@app.route("/api/equilibrio", methods=["POST"])
def api_equilibrio():
    d = request.json
    return jsonify(calc_equilibrio(
        cf             = float(d.get("custo_fixo", 0)),
        mc_unit        = float(d.get("mc_unitaria", 0)),
        preco          = float(d.get("preco_venda", 0)),
        depreciacao    = float(d.get("depreciacao", 0)),
        lucro_desejado = float(d.get("lucro_desejado", 0)),
    ))


if __name__ == "__main__":
    app.run(debug=True)
