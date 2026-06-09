'use strict';

/* ── NAV ─────────────────────────────────────────────── */
document.querySelectorAll('.snav').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.snav').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.sec).classList.add('active');
  });
});

/* ── FORMATTERS ──────────────────────────────────────── */
const brl = v => {
  if (typeof v !== 'number') return v;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const num2 = v => {
  if (typeof v !== 'number') return v;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pct = v => typeof v === 'number' ? `${num2(v)}%` : v;

/* ── API HELPER ──────────────────────────────────────── */
async function post(url, data) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error('Erro na resposta do servidor.');
  return r.json();
}

/* ── RESULT BUILDERS ─────────────────────────────────── */
function card(label, value, unit = '', color = '', desc = '') {
  return `
    <div class="rcard ${color}">
      <span class="rlabel">${label}</span>
      <div class="rval">${value}<span class="runit">${unit}</span></div>
      ${desc ? `<div class="rdesc">${desc}</div>` : ''}
    </div>`;
}

function renderCards(containerId, subtitle, cards) {
  const box = document.getElementById(containerId);
  box.classList.remove('hidden');
  box.innerHTML = `
    <p class="result-label">${subtitle}</p>
    <div class="result-grid">${cards.join('')}</div>
  `;
}

function showErr(id, msg) {
  const box = document.getElementById(id);
  box.classList.remove('hidden');
  box.innerHTML = `<p class="err">⚠ ${msg}</p>`;
}

/* ═══════════════════════════════════════════════════════
   01 — CICLO
═══════════════════════════════════════════════════════ */
async function calcCiclo() {
  const pmre         = +document.getElementById('pmre').value         || 0;
  const pmrv         = +document.getElementById('pmrv').value         || 0;
  const pmpc         = +document.getElementById('pmpc').value         || 0;
  const vendas       = +document.getElementById('vendas_anuais').value || 0;
  const estoque      = +document.getElementById('estoque_medio').value || 0;
  const cmv          = +document.getElementById('cmv').value           || 0;

  if (!pmre && !pmrv) { showErr('result-ciclo', 'Informe ao menos PMRE e PMRV.'); return; }

  try {
    const d = await post('/api/ciclo', { pmre, pmrv, pmpc, vendas_anuais: vendas,
      estoque_medio: estoque, cmv });

    const cccColor = d.ciclo_conversao_caixa < 0 ? 'green'
                   : d.ciclo_conversao_caixa > 60 ? 'red' : '';

    const cards = [
      card('Ciclo Operacional (CO)', num2(d.ciclo_operacional), ' dias', '',
        'PMRE + PMRV — tempo total do processo operacional'),
      card('Ciclo Conversão de Caixa (CCC)', num2(d.ciclo_conversao_caixa), ' dias', cccColor,
        d.ciclo_conversao_caixa < 0
          ? '✓ Fornecedores financiam as operações'
          : 'Dias financiados com capital próprio'),
      card('PMRE', num2(d.pmre), ' dias', '', 'Tempo médio de permanência em estoque'),
      card('PMRV', num2(d.pmrv), ' dias', '', 'Tempo médio para receber das vendas'),
      card('PMPC', num2(d.pmpc), ' dias', '', 'Prazo médio concedido por fornecedores'),
      card('Vendas / Dia', brl(d.vendas_dia), '', 'blue', 'Faturamento médio diário'),
    ];

    if (d.ncg) cards.push(card('NCG — Nec. de Capital de Giro', brl(d.ncg), '', 'green',
      'Capital necessário para financiar o ciclo'));
    if (d.giro_estoque) cards.push(card('Giro de Estoque', num2(d.giro_estoque), 'x', '',
      'Vezes que o estoque se renovou no ano'));
    if (d.ciclo_financeiro_valor) cards.push(card('Ciclo Financeiro (R$)', brl(d.ciclo_financeiro_valor), '', 'blue',
      'Valor total comprometido no ciclo de caixa'));

    renderCards('result-ciclo', 'RESULTADO — CICLOS OPERACIONAL E DE CAIXA', cards);
  } catch (e) {
    showErr('result-ciclo', 'Erro ao calcular. Verifique os valores.');
  }
}

/* ═══════════════════════════════════════════════════════
   02 — ANÁLISE MARGINAL
═══════════════════════════════════════════════════════ */
async function calcMarginal() {
  const receita   = +document.getElementById('m_receita').value || 0;
  const cv        = +document.getElementById('m_cv').value      || 0;
  const cf        = +document.getElementById('m_cf').value      || 0;
  const qtd       = +document.getElementById('m_qtd').value     || 1;
  const dep       = +document.getElementById('m_dep').value     || 0;
  const imp       = +document.getElementById('m_imp').value     || 0;

  if (!receita) { showErr('result-marginal', 'Informe a Receita Total.'); return; }

  try {
    const d = await post('/api/marginal', {
      receita, custo_variavel: cv, custo_fixo: cf,
      quantidade: qtd, depreciacao: dep, impostos_pct: imp,
    });

    const lucroColor = d.lucro_operacional >= 0 ? 'green' : 'red';

    const cards = [
      card('A.L. — Alavancagem Operacional', typeof d.al === 'number' ? num2(d.al) : d.al, 'x', 'blue',
        'Cada +1% na receita gera +' + (typeof d.al==='number'?num2(d.al):'-') + '% no lucro'),
      card('MC Unitária', brl(d.mc_unit), '', d.mc_unit >= 0 ? 'green' : 'red',
        'Contribuição de cada unidade aos custos fixos'),
      card('MC Total', brl(d.mc_total), '', d.mc_total >= 0 ? 'green' : 'red',
        'Total disponível para cobrir custos fixos'),
      card('Lucro Operacional', brl(d.lucro_operacional), '', lucroColor,
        'MC Total − Custos Fixos'),
      card('Lucro Líquido (após imp.)', brl(d.lucro_liquido), '', lucroColor,
        'Após impostos e depreciação'),
      card('C.P.M — PE Quantidade', typeof d.cpm_pe_qtd === 'number' ? num2(d.cpm_pe_qtd) : d.cpm_pe_qtd, ' un', 'orange',
        'Mínimo de unidades para cobrir custos fixos'),
      card('Índice de MC', pct(d.indice_mc_pct), '', '',
        'Percentual da receita que é margem'),
      card('Margem Operacional', pct(d.margem_op_pct), '', '',
        'Lucro operacional / Receita × 100'),
    ];

    const box = document.getElementById('result-marginal');
    box.classList.remove('hidden');
    box.innerHTML = `
      <p class="result-label">RESULTADO — ANÁLISE MARGINAL</p>
      <div class="result-grid">${cards.join('')}</div>
      ${buildCIMDR(d)}
    `;
  } catch (e) {
    showErr('result-marginal', 'Erro ao calcular. Verifique os valores.');
  }
}

function buildCIMDR(d) {
  const r = d.receita;
  if (!r) return '';
  const rows = [
    { cls: 'cv',  label: 'C — Custo Variável',  val: d.custo_var_total, pct: d.custo_var_total / r * 100 },
    { cls: 'imp', label: 'I — Impostos',         val: d.cimdr.impostos, pct: d.cimdr.impostos / r * 100 },
    { cls: 'mc',  label: 'M — Margem (MC)',      val: d.mc_total,       pct: d.indice_mc_pct },
    { cls: 'dep', label: 'D — Depreciação',      val: d.cimdr.depreciacao, pct: d.cimdr.depreciacao / r * 100 },
    { cls: 'res', label: 'R — Resultado Líquido',val: d.lucro_liquido,  pct: d.lucro_liquido / r * 100 },
  ];

  const rowsHTML = rows.map(row => `
    <div class="cimdr-row ${row.cls}">
      <span class="cname">${row.label}</span>
      <div class="cbar"><div class="cbar-fill" style="width:${Math.max(0,Math.min(100,row.pct))}%"></div></div>
      <span class="cpct">${num2(row.pct)}%</span>
      <span class="cval">${brl(row.val)}</span>
    </div>
  `).join('');

  return `
    <div class="cimdr-bar">
      <p class="cimdr-title">C.I.M.D.R — Decomposição da Receita de ${brl(r)}</p>
      ${rowsHTML}
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   03 — MARGEM DE CONTRIBUIÇÃO
═══════════════════════════════════════════════════════ */
async function calcMargem() {
  const preco  = +document.getElementById('mc_preco').value || 0;
  const cv     = +document.getElementById('mc_cv').value    || 0;
  const imp    = +document.getElementById('mc_imp').value   || 0;
  const cf     = +document.getElementById('mc_cf').value    || 0;
  const qtd    = +document.getElementById('mc_qtd').value   || 0;

  if (!preco) { showErr('result-margem', 'Informe o Preço de Venda.'); return; }

  try {
    const d = await post('/api/margem', {
      preco_venda: preco, custo_variavel_unit: cv,
      impostos_unit: imp, custo_fixo_total: cf, quantidade: qtd,
    });

    const cards = [
      card('MC Unitária', brl(d.mc_unitaria), '', d.mc_unitaria >= 0 ? 'green' : 'red',
        `Preço (${brl(preco)}) − CV (${brl(cv)}) − Imp (${brl(imp)})`),
      card('MC Total', brl(d.mc_total), '', d.mc_total >= 0 ? 'green' : 'red',
        `${num2(qtd)} un × ${brl(d.mc_unitaria)}`),
      card('Índice de MC', pct(d.indice_mc_pct), '', 'blue',
        'MC Unitária / Preço de Venda × 100'),
      card('Receita Total', brl(d.receita_total), '', '',
        `${num2(qtd)} un × ${brl(preco)}`),
      card('Lucro do Período', brl(d.lucro_liquido), '', d.lucro_liquido >= 0 ? 'green' : 'red',
        'MC Total − Custo Fixo Total'),
      card('PE — Quantidade', typeof d.pe_qtd === 'number' ? num2(d.pe_qtd) : d.pe_qtd, ' un', 'orange',
        'Vendas mínimas para cobrir todos os custos'),
    ];

    if (d.margem_seg_qtd !== null) {
      cards.push(card('Margem de Segurança (Qtd)',
        typeof d.margem_seg_qtd === 'number' ? num2(d.margem_seg_qtd) : d.margem_seg_qtd, ' un',
        d.margem_seg_qtd >= 0 ? 'green' : 'red',
        'Unidades vendidas além do PE'));
      cards.push(card('Margem de Segurança (%)',
        typeof d.margem_seg_pct === 'number' ? pct(d.margem_seg_pct) : d.margem_seg_pct, '', '',
        'Quanto pode cair sem dar prejuízo'));
    }

    renderCards('result-margem', 'RESULTADO — MARGEM DE CONTRIBUIÇÃO', cards);
  } catch (e) {
    showErr('result-margem', 'Erro ao calcular. Verifique os valores.');
  }
}

/* ═══════════════════════════════════════════════════════
   04 — PONTO DE EQUILÍBRIO
═══════════════════════════════════════════════════════ */
async function calcEquilibrio() {
  const cf    = +document.getElementById('pe_cf').value    || 0;
  const mc    = +document.getElementById('pe_mc').value    || 0;
  const preco = +document.getElementById('pe_preco').value || 0;
  const dep   = +document.getElementById('pe_dep').value   || 0;
  const lucro = +document.getElementById('pe_lucro').value || 0;

  if (!mc) { showErr('result-equilibrio', 'Informe a Margem de Contribuição Unitária.'); return; }

  try {
    const d = await post('/api/equilibrio', {
      custo_fixo: cf, mc_unitaria: mc, preco_venda: preco,
      depreciacao: dep, lucro_desejado: lucro,
    });

    const cards = [
      card('PE Contábil — Quantidade', typeof d.pe_contabil_qtd === 'number' ? num2(d.pe_contabil_qtd) : d.pe_contabil_qtd, ' un', 'blue',
        `CF (${brl(cf)}) ÷ MC Unit (${brl(mc)})`),
      card('PE Contábil — Valor', typeof d.pe_contabil_val === 'number' ? brl(d.pe_contabil_val) : d.pe_contabil_val, '', 'blue',
        'Faturamento mínimo para lucro zero'),
      card('PE Financeiro — Quantidade', typeof d.pe_financeiro_qtd === 'number' ? num2(d.pe_financeiro_qtd) : d.pe_financeiro_qtd, ' un', 'green',
        `CF sem depreciação (${brl(cf - dep)}) ÷ MC Unit`),
      card('PE Financeiro — Valor', typeof d.pe_financeiro_val === 'number' ? brl(d.pe_financeiro_val) : d.pe_financeiro_val, '', 'green',
        'Faturamento mínimo sem déficit de caixa'),
      card('PE Econômico — Quantidade', typeof d.pe_economico_qtd === 'number' ? num2(d.pe_economico_qtd) : d.pe_economico_qtd, ' un', 'orange',
        `(CF ${brl(cf)} + Lucro Desejado ${brl(lucro)}) ÷ MC`),
      card('PE Econômico — Valor', typeof d.pe_economico_val === 'number' ? brl(d.pe_economico_val) : d.pe_economico_val, '', 'orange',
        'Para atingir a meta de lucro mínimo'),
    ];

    renderCards('result-equilibrio', 'RESULTADO — PONTOS DE EQUILÍBRIO (Contábil · Financeiro · Econômico)', cards);
  } catch (e) {
    showErr('result-equilibrio', 'Erro ao calcular. Verifique os valores.');
  }
}

/* ── ENTER KEY ───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const sec = document.querySelector('.section.active')?.id;
  ({ ciclo: calcCiclo, marginal: calcMarginal, margem: calcMargem, equilibrio: calcEquilibrio })[sec]?.();
});
