/* decks2.js — the short path, steps 8–12: race, papers, now; and the side rooms
   `designs`, `field` (the census), `cases` and `sandbox`. All numbers come from
   data.js (Appendix D grids, Table 2, Appendix B) or are computed live by engine.js. */
(function () {
  'use strict';
  const E = Engine, V = App.V, D = window.SIMDATA, S = App.shared;
  const W = 640, H = 400;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PRACT = [
    { key: 'rej_coef', id: 'coef', name: 'the product-term coefficient', short: 'Coefficient', cls: 'coef', desc: 'the p-value on x·z in the probit, read the way the researcher reads it' },
    { key: 'rej_plot_1', id: 'plot', name: 'the two-line plot', short: 'Plot', cls: 'plot', desc: 'declares moderation the way a reader\'s eye does: the gap between the two lines changes by more than one point across the usual window' },
    { key: 'rej_lpm', id: 'lpm', name: 'the linear probability model', short: 'Straight line', cls: 'lpm', desc: 'skips the curve: fits a straight line to the 0/1 outcome and reads its x·z coefficient, as nearly half the field does' },
    { key: 'rej_aie', id: 'aie', name: 'the ginteff AIE', short: 'AIE', cls: 'aie', desc: 'the average interaction effect from the step before, tested with its own standard error' }
  ];
  const NS = [500, 1500, 7500, 60000];
  function num(v) { return v == null ? null : +v; }
  function gridRow(o) {
    return D.grid.find((r) => r.int_type === o.intType && num(r.skew_x) === o.skewX && num(r.skew_z) === o.skewZ &&
      (o.intType === 'cxc' ? true : num(r.px) === o.px) && num(r.base_target) === o.base && r.regime === o.regime && num(r.n) === o.n);
  }
  const HEAD = { intType: 'cxc', skewX: 2, skewZ: 0, base: 0.17 }; // the paper's Figure 4 design
  function pct(v) { return v == null ? '—' : Math.round(100 * v) + '%'; }
  const sw = (cls) => `<span class="sw" style="background: var(--c-${cls})"></span>`;

  // ---------- horizontal rate bars ----------
  function rateBars(svg, o) {
    o = o || {};
    const sx = V.scale(0, 1, 230, 600), rowH = o.rowH || 56, top = o.top || 78;
    const g = V.el('g', {}, svg);
    const title = V.text(g, 24, 32, o.title || '', 'label-strong');
    const sub = V.text(g, 24, 50, o.subtitle || '', 'label-muted');
    const grid = V.el('g', { class: 'grid' }, g);
    [0.25, 0.5, 0.75, 1].forEach((t) => V.el('line', { x1: sx(t), x2: sx(t), y1: top - 10, y2: top + 4 * rowH - 6 }, grid));
    V.axisX(g, sx, top + 4 * rowH - 6, { ticks: [0, .25, .5, .75, 1], fmt: (t) => Math.round(100 * t) + '%', label: o.xlabel || 'share of 1,000 simulated samples declaring moderation' });
    V.el('line', { x1: sx(0.05), x2: sx(0.05), y1: top - 6, y2: top + 4 * rowH - 6, class: 'nominal' }, g);
    const nominal = V.text(g, sx(0.05) + 5, top - 10, 'nominal 5%: where an honest test belongs', 'label-muted');
    const rows = PRACT.map((p, k) => {
      const y = top + k * rowH;
      V.text(g, 220, y + 19, p.short, 'label-strong', { 'text-anchor': 'end' });
      V.el('rect', { x: sx(0), y: y + 4, width: sx(1) - sx(0), height: 24, rx: 4, class: 'lane' + (p.id === 'aie' ? ' home' : '') }, g);
      const bar = V.el('rect', { x: sx(0), y: y + 4, width: 0, height: 24, rx: 4, class: 'bar ' + p.cls }, g);
      const val = V.text(g, sx(0) + 6, y + 21, '', 'label-strong', { opacity: 0 });
      return { p: p, bar: bar, val: val, y: y };
    });
    function set(row, animate) {
      rows.forEach((r) => {
        const v = row ? num(row[r.p.key]) : null;
        if (v == null) { r.bar.setAttribute('width', 0); r.val.textContent = 'not defined for this design'; r.val.setAttribute('x', sx(0) + 6); r.val.setAttribute('opacity', 1); return; }
        const wEnd = sx(v) - sx(0), wStart = parseFloat(r.bar.getAttribute('width')) || 0;
        const place = () => { r.val.setAttribute('x', Math.min(sx(v) + 6, 604)); r.val.textContent = pct(v); r.val.setAttribute('opacity', 1); };
        if (animate && !reduced) {
          const t0 = performance.now(), token = (r.token = (r.token || 0) + 1); r.val.setAttribute('opacity', 0);
          const step = (now) => { if (r.token !== token) return; const t = Math.max(0, Math.min(1, (performance.now() - t0) / 700)), e = 1 - Math.pow(1 - t, 3); r.bar.setAttribute('width', (wStart + (wEnd - wStart) * e).toFixed(1)); if (t < 1) requestAnimationFrame(step); else place(); };
          requestAnimationFrame(step);
        } else { r.token = (r.token || 0) + 1; r.bar.setAttribute('width', wEnd.toFixed(1)); place(); }
      });
    }
    return { g: g, set: set, rows: rows, sx: sx, title: title, sub: sub, nominal: nominal };
  }

  const contestantsHtml = `<table class="tbl contestants"><tbody>` + PRACT.map((p) => `<tr><td style="white-space:nowrap">${sw(p.cls)}<strong>${p.short}</strong></td><td>${p.desc}</td></tr>`).join('') + '</tbody></table>';
  const backLink = `<p style="margin-top:22px"><a class="door is-back" data-go="back" href="#">Back to the path</a></p>`;

  // ======================================================================
  // 8–9 — race
  // ======================================================================
  App.registerDeck({
    id: 'race', title: 'The race', short: 'The race',
    slides: [
      {
        title: 'Place your bets', stage: true, gate: true, gateHint: 'Place your bet first', cls: 'wide-prose',
        prose: (c) => `
          <p class="kicker">The race</p>
          <h2>Four ways to test, one true zero. Place your bet.</h2>
          <p>One made-up world proves little, so the paper simulated 174 of them. This is the typical one: investment skewed the way size and count variables are, 17 in 100 succeeding, 1,500 firms, and a true average interaction effect of exactly zero. Any verdict of "moderation" here is a false alarm.</p>
          <p>The four ways are listed under the chart. Each reads 1,000 simulated samples. <strong>Which one cries moderation most often?</strong></p>
          <div class="chips" id="race0-chips">${PRACT.map((p) => `<button class="chip" type="button" data-bet="${p.id}">${p.short}</button>`).join('')}</div>
          <div class="callout reveal" id="race0-reveal"></div>`,
        below: `<div class="controls" id="race0-controls" hidden><div class="control" style="min-width:240px"><label for="race0-n">sample size</label><input id="race0-n" type="range" min="0" max="3" step="1" value="1"><span class="val" id="race0-n-v">n = 1,500</span></div><button class="btn" type="button" id="race0-grow">▶ Watch the sample grow</button>
          <div class="toggle" id="race0-regime" role="group" aria-label="which truth"><button type="button" data-regime="prob_null" class="is-on" aria-pressed="true">true effect = 0</button><button type="button" data-regime="index_null" aria-pressed="false">real effect, but β₃ = 0</button></div></div>${contestantsHtml}`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const bars = rateBars(svg, { title: '', subtitle: '' });
          const q = (id) => api.below.querySelector(id);
          const sl = q('#race0-n'), sv = q('#race0-n-v'), tg = api.below.querySelectorAll('#race0-regime button');
          let regime = 'prob_null', shown = false;
          const rowAt = (n) => gridRow(Object.assign({}, HEAD, { regime: regime, n: n }));
          function paint(animate) {
            const n = NS[+sl.value], row = rowAt(n);
            sv.textContent = 'n = ' + V.fmtN(n);
            bars.title.textContent = regime === 'prob_null' ? 'True average effect = 0: share of samples declaring moderation' : 'β₃ = 0, real effect of ' + V.fmtPP(num(row.true_aie)) + ': share of samples detecting it';
            bars.sub.textContent = 'probit, c×c, x skewed (2), base rate .17, n = ' + V.fmtN(n) + ', 1,000 replications each';
            bars.nominal.textContent = regime === 'prob_null' ? 'nominal 5%: where an honest test belongs' : '5%: what a blind test scores';
            if (shown) bars.set(row, animate);
          }
          sl.addEventListener('input', () => paint(true));
          tg.forEach((b) => b.addEventListener('click', () => { tg.forEach((o) => { o.classList.toggle('is-on', o === b); o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); regime = b.getAttribute('data-regime'); paint(true); }));
          paint(false);
          S.betChips(api, 'race0-chips', 'plot', (bet, animate) => {
            shown = true; q('#race0-controls').hidden = false;
            paint(animate);
            const rows = NS.map((n) => gridRow(Object.assign({}, HEAD, { regime: 'prob_null', n: n }))), row = rows[1];
            const r = document.getElementById('race0-reveal');
            const you = PRACT.find((p) => p.id === bet);
            const lead = bet === 'plot' ? 'Right: the plot.' : `You bet on the ${you ? you.short.toLowerCase() : 'coefficient'}; it is the plot.`;
            r.innerHTML = `${lead} The two-line display cries moderation in <strong>${pct(num(row.rej_plot_1))}</strong> of samples in which there is none (still ${pct(num(row.rej_plot_5))} if the eye needs a five-point change), the coefficient in ${pct(num(row.rej_coef))}. The straight line and the AIE sit near the dashed line: the one false alarm in twenty that an honest test is allowed. <strong>And more data make it worse.</strong> With 500, 1,500, 7,500 and 60,000 firms the coefficient cries moderation in ${rows.map((x) => pct(num(x.rej_coef))).join(', ').replace(/, ([^,]*)$/, ' and $1')} of samples, because what it estimates ever more precisely is not what the hypothesis is about. The AIE stays between ${pct(Math.min.apply(null, rows.map((x) => num(x.rej_aie))))} and ${pct(Math.max.apply(null, rows.map((x) => num(x.rej_aie))))}. Press <em>Watch the sample grow</em> under the chart. <a class="door" data-go="designs/0" href="#designs/0">All 174 designs</a>`;
            r.classList.add('is-open'); api.unlock();
            const grow = q('#race0-grow');
            if (grow && !grow.dataset.wired) { grow.dataset.wired = '1'; grow.addEventListener('click', () => {
              if (regime !== 'prob_null') tg[0].click();
              const to = (k) => () => { sl.value = k; paint(true); };
              if (S.reduced) { to(3)(); return; }
              to(0)(); S.sequence(api, [to(1), to(2), to(3)], { delay: 1100, gap: 1300 });
            }); }
          }, 'race0-bet');
        }
      },
      {
        title: 'The straight line', stage: true,
        prose: `
          <p class="kicker">The race</p>
          <h2>The straight line fails more quietly</h2>
          <p>Nearly half of the 202 studies skip the curve: they fit a straight line to the yes/no outcome (the linear probability model), because its x·z coefficient <em>is</em> the interaction effect if the world is linear. In the race its false alarms looked fine. Its estimates are the problem.</p>
          <p>This world has a real interaction effect of +3.9 points, so the question is whether a method's 95% interval contains it. The chart shows typical intervals at four sample sizes. The straight line's interval tightens around a number that is not the truth: it contains the truth in 93% of samples with 500 firms, and in 24% with 60,000. The AIE's stays at 94% to 96%.</p>
          <p class="small">With symmetric variables the straight line does better. This is what skewed variables do to it, and more than half of the 202 studies interact at least one. <a class="door" data-go="lpm/0" href="#lpm/0">Where the straight line bends</a></p>`,
        below: `<div id="race1-cov"></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const rows = NS.map((n) => gridRow(Object.assign({}, HEAD, { regime: 'power', n: n })));
          const truth = num(rows[1].true_aie);
          const sx = V.scale(-0.005, 0.085, 90, 600);
          const g = V.el('g', {}, svg);
          V.text(g, 24, 30, 'A true effect of ' + V.fmtPP(truth) + ': the two 95% intervals as the sample grows', 'label-strong');
          V.text(g, 24, 48, 'typical 95% intervals, from the paper\'s simulations; red: the interval misses the truth', 'label-muted');
          [['lpm', 'linear model'], ['aie', 'ginteff AIE']].forEach((p, k) => { V.el('rect', { x: 24 + k * 130, y: 58, width: 10, height: 10, rx: 2, fill: 'var(--c-' + p[0] + ')' }, g); V.text(g, 39 + k * 130, 67, p[1], 'label-muted'); });
          V.axisX(g, sx, 330, { ticks: [0, 0.02, 0.04, 0.06, 0.08], fmt: (t) => (t > 0 ? '+' : '') + Math.round(100 * t) + ' pp', label: 'estimated interaction effect (percentage points)' });
          V.el('line', { x1: sx(truth), x2: sx(truth), y1: 76, y2: 330, class: 'truth' }, g);
          V.text(g, sx(truth) + 5, 86, 'true effect', 'label-muted');
          const rowG = [];
          NS.forEach((n, k) => {
            const y = 110 + k * 55, row = rows[k], rg = V.el('g', { style: 'transition: opacity .5s ease' }, g);
            rowG.push(rg);
            V.text(rg, 84, y + 4, 'n = ' + V.fmtN(n), 'label-muted', { 'text-anchor': 'end' });
            const lb = num(row.lpm_bias), lr = num(row.lpm_rmse) || 0, ab = num(row.aie_bias), ar = num(row.aie_rmse) || 0;
            const lse = Math.sqrt(Math.max(lr * lr - lb * lb, 1e-10)), ase = Math.sqrt(Math.max(ar * ar - ab * ab, 1e-10));
            const lc = truth + lb, ac = truth + ab;
            const lMiss = (lc - 1.96 * lse > truth) || (lc + 1.96 * lse < truth);
            V.el('line', { x1: sx(lc - 1.96 * lse), x2: sx(lc + 1.96 * lse), y1: y - 9, y2: y - 9, class: 'ci', style: 'stroke: ' + (lMiss ? 'var(--alarm)' : 'var(--c-lpm)') }, rg);
            V.el('circle', { cx: sx(lc), cy: y - 9, r: 5, class: 'est', style: 'fill: ' + (lMiss ? 'var(--alarm)' : 'var(--c-lpm)') }, rg);
            V.el('line', { x1: sx(ac - 1.96 * ase), x2: sx(ac + 1.96 * ase), y1: y + 11, y2: y + 11, class: 'ci' }, rg);
            V.el('circle', { cx: sx(ac), cy: y + 11, r: 5, class: 'est' }, rg);
          });
          if (!S.reduced && !api.flag('race/1:seen')) { rowG.forEach((rg) => { rg.style.opacity = 0; }); S.sequence(api, rowG.map((rg) => () => { rg.style.opacity = 1; }), { delay: 500, gap: 650 }); api.onCleanup(() => rowG.forEach((rg) => { rg.style.opacity = 1; })); }
          api.flag('race/1:seen', true);
          api.below.querySelector('#race1-cov').innerHTML = `<table class="tbl"><thead><tr><th>95% interval covers the truth in</th>${NS.map((n) => '<th style="text-align:right;white-space:nowrap">n = ' + V.fmtN(n) + '</th>').join('')}</tr></thead><tbody>
            <tr><td>${sw('lpm')}linear probability model</td>${rows.map((r) => '<td class="num">' + pct(num(r.lpm_cover)) + '</td>').join('')}</tr>
            <tr class="hl"><td>${sw('aie')}ginteff AIE</td>${rows.map((r) => '<td class="num">' + pct(num(r.aie_cover)) + '</td>').join('')}</tr></tbody></table>`;
        }
      }
    ]
  });

  // ---------- side room: all the designs ----------
  App.registerDeck({
    id: 'designs', title: 'All 174 designs', short: 'All the designs', parent: 'race', parentIdx: 0,
    slides: [
      {
        title: 'All 99 designs', stage: true, cls: 'wide-prose',
        prose: `
          <p class="kicker">Side room · All the designs</p>
          <h2>All 99 core designs</h2>
          <p>The picture so far is one design. This explorer holds the paper's whole core grid: three kinds of interaction, four levels of skewness, four base rates, three regimes, and four sample sizes where they were run. Every bar is the paper's number, and the controls only offer cells the paper ran.</p>
          <p>Three things worth trying:</p>
          <div class="chips" id="race4-try"><button class="chip" type="button" data-try="bxb">binary × binary: the plot is undefined</button><button class="chip" type="button" data-try="sym50">no skew, base .50: the linear model at 21%</button><button class="chip" type="button" data-try="power">the power regime: linear and AIE alike</button></div>
          <p class="small">The side arms (logit link, shares, rare events, three-way interactions, Zelner's simulation method) are on the next stage.</p>`,
        below: `<div class="controls">
            <div class="control"><label for="race4-it">interaction</label><select id="race4-it"><option value="cxc">continuous × continuous</option><option value="bxc">binary × continuous</option><option value="bxb">binary × binary</option></select></div>
            <div class="control"><label for="race4-sk">skewness of x</label><select id="race4-sk"><option>0</option><option>1</option><option selected>2</option><option>4</option></select></div>
            <div class="control"><label for="race4-skz">skewness of z</label><select id="race4-skz"><option selected>0</option><option>2</option></select></div>
            <div class="control"><label for="race4-px">P(x = 1)</label><select id="race4-px"><option>0.1</option><option selected>0.5</option></select></div>
            <div class="control"><label for="race4-base">base rate</label><select id="race4-base"><option>0.02</option><option>0.06</option><option selected>0.17</option><option>0.5</option></select></div>
            <div class="control"><label for="race4-reg">regime</label><select id="race4-reg"><option value="prob_null" selected>probability null: true average effect = 0</option><option value="index_null">index null: β₃ = 0</option><option value="power">power: real product-driven effect</option></select></div>
            <div class="control"><label for="race4-n">n</label><select id="race4-n"></select></div>
          </div><div class="small" id="race4-note"></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const bars = rateBars(svg, { title: '', subtitle: '' });
          const q = (id) => api.below.querySelector(id);
          const sel = { it: q('#race4-it'), sk: q('#race4-sk'), skz: q('#race4-skz'), px: q('#race4-px'), base: q('#race4-base'), reg: q('#race4-reg'), n: q('#race4-n') };
          function current() {
            const it = sel.it.value;
            return { intType: it, skewX: it === 'cxc' ? +sel.sk.value : 0, skewZ: it === 'bxb' ? 0 : +sel.skz.value, px: it === 'cxc' ? null : +sel.px.value, base: +sel.base.value, regime: sel.reg.value };
          }
          function rowsFor(o) { return D.grid.filter((r) => r.int_type === o.intType && num(r.skew_x) === o.skewX && num(r.skew_z) === o.skewZ && (o.intType === 'cxc' || num(r.px) === o.px) && num(r.base_target) === o.base && r.regime === o.regime); }
          function refreshOptions() {
            const it = sel.it.value;
            sel.sk.parentElement.hidden = it !== 'cxc'; sel.skz.parentElement.hidden = it !== 'bxc'; sel.px.parentElement.hidden = it === 'cxc';
            // base rates available for this design family
            const fam = D.grid.filter((r) => r.int_type === it && (it !== 'cxc' || num(r.skew_x) === +sel.sk.value) && (it !== 'bxc' || num(r.skew_z) === +sel.skz.value) && (it === 'cxc' || num(r.px) === +sel.px.value));
            const bases = Array.from(new Set(fam.map((r) => num(r.base_target)))).sort((a, b) => b - a);
            const keepBase = bases.indexOf(+sel.base.value) >= 0 ? +sel.base.value : bases[0];
            sel.base.innerHTML = bases.map((b) => `<option value="${b}"${b === keepBase ? ' selected' : ''}>${b}</option>`).join('');
            const rows = rowsFor(current());
            const ns = Array.from(new Set(rows.map((r) => num(r.n)))).sort((a, b) => a - b);
            const keepN = ns.indexOf(+sel.n.value) >= 0 ? +sel.n.value : (ns.indexOf(1500) >= 0 ? 1500 : ns[0]);
            sel.n.innerHTML = ns.map((n) => `<option value="${n}"${n === keepN ? ' selected' : ''}>${V.fmtN(n)}</option>`).join('');
          }
          function upd() {
            refreshOptions();
            const o = current(); o.n = +sel.n.value;
            const row = gridRow(o);
            const label = (o.intType === 'cxc' ? 'c×c, skew(x) ' + o.skewX : o.intType === 'bxc' ? 'b×c, P(x=1) = ' + o.px + (o.skewZ ? ', skew(z) ' + o.skewZ : '') : 'b×b, P(x=1) = ' + o.px) + ', base rate ' + o.base + ', n = ' + V.fmtN(o.n);
            bars.title.textContent = o.regime === 'prob_null' ? 'True average effect = 0: false-positive rates' : o.regime === 'index_null' ? 'β₃ = 0, curvature-driven effect: detection rates' : 'Real product-driven effect: power';
            bars.sub.textContent = label;
            if (row) {
              bars.set(row, false);
              q('#race4-note').innerHTML = 'True average interaction effect in this design: <strong>' + V.fmtPP(num(row.true_aie), 2) + '</strong>. Coverage of the truth by 95% intervals: linear model ' + pct(num(row.lpm_cover)) + ', AIE ' + pct(num(row.aie_cover)) + '.' + (row.rej_plot_1 == null ? ' The plot is undefined here: no continuous moderator for two lines to fan across.' : '');
            } else { bars.set(null, false); q('#race4-note').textContent = ''; }
          }
          Object.keys(sel).forEach((k) => sel[k].addEventListener('change', upd));
          api.prose.querySelectorAll('#race4-try .chip').forEach((ch) => ch.addEventListener('click', () => {
            const t = ch.getAttribute('data-try');
            if (t === 'bxb') { sel.it.value = 'bxb'; sel.px.value = '0.5'; sel.reg.value = 'prob_null'; }
            if (t === 'sym50') { sel.it.value = 'cxc'; sel.sk.value = '0'; sel.reg.value = 'prob_null'; refreshOptions(); sel.base.value = '0.5'; }
            if (t === 'power') { sel.it.value = 'cxc'; sel.sk.value = '2'; sel.reg.value = 'power'; refreshOptions(); sel.base.value = '0.17'; }
            upd();
          }));
          upd();
        }
      },
      {
        title: 'The side arms', stage: true, cls: 'wide-prose',
        prose: `
          <p class="kicker">Side room · All the designs</p>
          <h2>Nothing here is special to the probit, or to yes/no outcomes</h2>
          <p>The appendix repeats the race with a logit link, with share outcomes (fitted by fractional probit), with a rare outcome at a base rate of .003, with three-way interactions, and with the simulation-based cross-difference of Zelner (2009), the one existing practice that also tests on the probability scale. Pick an arm; each row is one design under the true zero and the share of samples in which each practice declares moderation.</p>
          <p>The share outcomes are where the coefficient is at its worst: 94% to 100% false positives at n = 1,500.</p>` + backLink,
        below: `<div class="controls"><div class="control"><label for="race5-arm">arm</label><select id="race5-arm"><option value="logit">logit link (binary)</option><option value="frac">share (fractional) outcome</option><option value="rare">rare events, base .003</option><option value="bxbxb">three-way, binary</option><option value="zelner">Zelner cross-difference</option></select></div></div>`,
        mount: function (api) {
          const stage = api.stage;
          const q = (id) => api.below.querySelector(id);
          function label(key) {
            return key.replace(/^(bin|frac|rare|zel)_/, '').replace('probit_', '').replace('logit_', '').replace(/_(index_null|prob_null|power)_n\d+$/, '')
              .replace('cxc', 'c×c').replace('bxc', 'b×c').replace('bxbxb', 'b×b×b').replace('bxb', 'b×b').replace(/skx(\d)/, 'skew(x) $1').replace(/skz(\d)/, 'skew(z) $1').replace(/px(\d+)/, (m, p) => 'P(x=1) .' + p).replace(/_b(\d+)/, (m, b) => ', base .' + (b.length === 1 ? '0' + b : b)).replace(/_/g, ' ');
          }
          function render() {
            const arm = q('#race5-arm').value;
            let rows, cols, extra = '';
            const four = [['rej_coef', 'coef', 'Coefficient'], ['rej_plot_1', 'plot', 'Plot'], ['rej_lpm', 'lpm', 'Linear'], ['rej_aie', 'aie', 'AIE']];
            if (arm === 'zelner') { rows = D.zelner.filter((r) => r.regime === 'prob_null'); cols = [['rej_coef', 'coef', 'Coefficient'], ['rej_zelner', 'plot', 'Zelner'], ['rej_lpm', 'lpm', 'Linear'], ['rej_aie', 'aie', 'AIE']]; extra = 'Zelner: simulation-based 95% interval of the cross-difference at covariate means.'; }
            else if (arm === 'rare') { rows = D.rare.filter((r) => r.regime === 'prob_null'); cols = four; extra = 'In the three-way rare-event cells the coefficient\'s test is degenerate (separation), so its 0% is not a success.'; }
            else if (arm === 'bxbxb') { rows = D.sidearms.filter((r) => /bxbxb/.test(r.key) && r.regime === 'prob_null'); cols = four; extra = 'The zero-to-one triple difference is imprecise at n = 1,500; this arm certifies size and coverage, not power.'; }
            else if (arm === 'frac') { rows = D.sidearms.filter((r) => /^frac/.test(r.key) && r.regime === 'prob_null'); cols = four; }
            else { rows = D.sidearms.filter((r) => /^bin_logit/.test(r.key) && r.regime === 'prob_null'); cols = four; }
            stage.innerHTML = '';
            const wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;overflow:auto;padding:12px 16px;';
            let html = '<table class="tbl"><thead><tr><th>design (true average effect = 0)</th>' + cols.map((c) => '<th style="text-align:right">' + sw(c[1]) + c[2] + '</th>').join('') + '</tr></thead><tbody>';
            rows.forEach((r) => { html += '<tr><td>' + label(r.key) + ', n = ' + V.fmtN(num(r.n)) + '</td>' + cols.map((c) => '<td class="num">' + (r[c[0]] == null ? '—' : pct(num(r[c[0]]))) + '</td>').join('') + '</tr>'; });
            html += '</tbody></table><div class="small muted">' + (extra || 'Share of 1,000 samples declaring moderation when the true average effect is zero.') + '</div>';
            wrap.innerHTML = html; stage.appendChild(wrap);
          }
          q('#race5-arm').addEventListener('change', render); render();
        }
      },
    ]
  });

  // ---------- side room: what the 202 did (the census) ----------
  const CENSUS = { total: 202, aie: 11, lpm: 93, point: 39, none: 59,
    journals: [
      { id: 'AMJ', name: 'Academy of Management Journal', emp: 119, q: 26, aie: 8, lpm: 38, point: 12, none: 42, lpmEst: 35 },
      { id: 'SMJ', name: 'Strategic Management Journal', emp: 232, q: 62, aie: 8, lpm: 52, point: 16, none: 24, lpmEst: 56 },
      { id: 'OrgSci', name: 'Organization Science', emp: 241, q: 74, aie: 3, lpm: 47, point: 24, none: 26, lpmEst: 47 },
      { id: 'ASQ', name: 'Administrative Science Quarterly', emp: 37, q: 14, aie: 0, lpm: 71, point: 14, none: 14, lpmEst: 79 },
      { id: 'JOM', name: 'Journal of Management', emp: 151, q: 26, aie: 8, lpm: 23, point: 23, none: 46, lpmEst: 23 },
      { id: 'All', name: 'All five journals', emp: 780, q: 202, aie: 5, lpm: 46, point: 19, none: 29, lpmEst: 48 }
    ] };
  const CATS = [
    { id: 'aie', name: 'Interaction effect from the nonlinear model', desc: 'an inferential statistic on a probability-scale interaction quantity' },
    { id: 'lpm', name: 'Linear probability model coefficient', desc: 'the interaction coefficient of a linear model fitted to the limited outcome' },
    { id: 'point', name: 'Pointwise test of levels only', desc: 'effects or predicted probabilities tested at selected moderator values, without a test of the difference' },
    { id: 'none', name: 'No formal test of the interaction', desc: 'the coefficient\'s sign, an odds ratio, or a plot, with no inferential statistic for the interaction' }
  ];
  function waffle(svg, o) {
    const cols = 19, size = 22, gap = 3, x0 = 40, y0 = 60;
    const g = V.el('g', { class: 'waffle' }, svg);
    const cells = [];
    for (let i = 0; i < CENSUS.total; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      cells.push(V.el('rect', { x: x0 + c * (size + gap), y: y0 + r * (size + gap), width: size, height: size, rx: 4 }, g));
    }
    V.text(svg, x0, 38, o.title || '202 articles, one square each', 'label-strong');
    return { g: g, cells: cells };
  }
  function shuffledOrder() { const order = []; for (let i = 0; i < CENSUS.total; i++) order.push(i); const rng = E.mulberry32(11); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; } return order; }
  App.registerDeck({
    id: 'field', title: 'What the 202 did', short: 'What the 202 did', parent: 'start', parentIdx: 0,
    slides: [
      {
        title: 'What the 202 did', stage: true,
        prose: `
          <p class="kicker">Side room · What the field does</p>
          <h2>What the 202 did</h2>
          <p>The paper screened every empirical article in five leading management journals from 2023 to 2025, 780 of them. 202 test a moderation hypothesis on a limited outcome: a yes or no, a share, an ordered or multinomial choice. Each is a square; hover them.</p>
          <p>Nearly half abandon the curve for a straight line. One in five tests the effect at chosen values of the moderator and stops there, which shows where the effect is, not whether it differs. Three in ten report no test of the interaction effect at all: the product term's sign and stars, an odds ratio, a picture. Eleven, in blue, test the interaction effect from the model their outcome calls for.</p>
          <p>The mix differs by journal; the shortfall does not.</p>
          <div class="chips" id="field0-j">${CENSUS.journals.map((j) => `<button class="chip${j.id === 'All' ? ' is-selected' : ''}" type="button" data-j="${j.id}">${j.id}</button>`).join('')}</div>
          <div id="field0-tbl"></div>` + backLink,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const wf = waffle(svg, { title: '202 articles by the strongest test of the focal interaction' });
          const order = shuffledOrder();
          const assign = {}; let k = 0;
          [['aie', CENSUS.aie], ['lpm', CENSUS.lpm], ['point', CENSUS.point], ['none', CENSUS.none]].forEach(([id, n]) => { for (let j = 0; j < n; j++) assign[order[k++]] = id; });
          wf.cells.forEach((c, i) => { c.classList.add('c-' + assign[i]); });
          const tip = V.tooltip(api.stage);
          wf.g.addEventListener('mousemove', (e) => { const i = wf.cells.indexOf(e.target); if (i < 0) { tip.hide(); return; } const cat = CATS.find((c) => c.id === assign[i]); tip.show(e.clientX, e.clientY, '<strong>' + cat.name + '</strong>'); });
          wf.g.addEventListener('mouseleave', tip.hide);
          [['aie', 11, 'effect test'], ['lpm', 93, 'linear model'], ['point', 39, 'pointwise levels'], ['none', 59, 'no test']].forEach(([id, n, lab], j) => {
            const y = 372;
            const x = [40, 160, 300, 460][j];
            V.el('rect', { x: x, y: y - 11, width: 12, height: 12, rx: 3, class: 'c-' + id }, wf.g);
            V.text(svg, x + 18, y, n + ' ' + lab, 'label-muted');
          });
          function table(jid) {
            const j = CENSUS.journals.find((x) => x.id === jid);
            api.prose.querySelector('#field0-tbl').innerHTML = `<table class="tbl"><thead><tr><th>${j.name}</th><th style="text-align:right">share of ${j.q} qualifying</th></tr></thead><tbody>
              <tr><td>Interaction effect from a nonlinear model</td><td class="num" style="color: var(--blue)">${j.aie}%</td></tr>
              <tr><td>Linear probability model coefficient</td><td class="num">${j.lpm}%</td></tr>
              <tr><td>Pointwise test of levels only</td><td class="num">${j.point}%</td></tr>
              <tr><td>No formal test</td><td class="num">${j.none}%</td></tr>
              <tr><td class="muted">Linear model as the main estimator (overlaps the rows above)</td><td class="num muted">${j.lpmEst}%</td></tr></tbody></table>`;
          }
          api.prose.querySelectorAll('#field0-j .chip').forEach((ch) => ch.addEventListener('click', () => { api.prose.querySelectorAll('#field0-j .chip').forEach((o) => o.classList.toggle('is-selected', o === ch)); table(ch.getAttribute('data-j')); }));
          table('All');
        }
      }
    ]
  });

  // ======================================================================
  // 11 — papers
  // ======================================================================
  App.registerDeck({
    id: 'papers', title: 'Three papers', short: 'Three papers',
    slides: [
      {
        title: 'Three published studies, one line added', layout: 'prose', cls: 'is-wide', nextLabel: 'So what should I do?',
        prose: `
          <p class="kicker">Three papers</p>
          <h2>Does it matter in a real paper?</h2>
          <p>The paper re-ran three published analyses, one per kind of outcome, and added the one missing line. None of the three collapses. All three change.</p>
          <table class="tbl cases"><thead><tr><th>published study</th><th>what was reported</th><th>with the interaction effect tested</th></tr></thead><tbody>
            <tr><td><strong>Epitropaki &amp; Avramidis (2024)</strong><span class="sub">a leadership role, yes or no · 9,915 people</span></td>
              <td>Does early disadvantage deepen the scar that unemployment leaves on later leadership? Tested by comparing the effect of unemployment at two chosen levels of disadvantage: −0.9 points, significant.</td>
              <td><span class="verdict pos">holds, a quarter smaller</span><span class="est">AIE −0.63 pp [−0.98, −0.28]</span> and more precise. The two chosen levels sat where the interaction is stronger than it is for the average person.</td></tr>
            <tr><td><strong>Adler &amp; Ayala-Hurtado (2025)</strong><span class="sub">agreement on a 1-to-5 scale · 1,536 people</span></td>
              <td>A positive, significant interaction coefficient, read as about half a scale point more agreement on average.</td>
              <td><span class="verdict pos">real, and it polarises</span><span class="est">+41 pp strongly agree · +10 pp strongly disagree</span> while the middle of the scale empties. One coefficient, or one average, cannot show that.</td></tr>
            <tr><td><strong>Rangan &amp; Sengul (2009)</strong><span class="sub">a share between 0 and 1 · 225 firms</span></td>
              <td>Two moderation claims. Both coefficients are significant by the authors' own standard in every model they ran, one of them against their hypothesis.</td>
              <td><span class="verdict neg">one robust, one fragile</span><span class="est">the fragile one: null alone · significant together</span> One effect is there in every model. The other appears only when both interactions are entered together: a three-and-a-half-fold swing that the coefficients never hint at.</td></tr>
          </tbody></table>
          <p>Same data, same models. Only the quantity that carries the test changed. <a class="door" data-go="cases/0" href="#cases/0">Walk through the three cases</a></p>`
      }
    ]
  });

  // ---------- side room: the three cases ----------
  function forest(svg, o) {
    const sx = V.scale(o.min, o.max, o.left || 250, 600);
    const g = V.el('g', {}, svg);
    V.text(g, 24, 32, o.title || '', 'label-strong');
    V.text(g, 24, 50, o.subtitle || '', 'label-muted');
    V.axisX(g, sx, o.axisY || 330, { ticks: o.ticks, fmt: o.fmt, label: o.xlabel });
    V.el('line', { x1: sx(0), x2: sx(0), y1: 62, y2: o.axisY || 330, class: 'zero soft' }, g);
    return { g: g, sx: sx };
  }
  function ciRow(f, y, est, lo, hi, label, sig, dotsVals, dotsSx) {
    V.text(f.g, (f.sx.r0) - 10, y + 4, label, 'label-strong', { 'text-anchor': 'end' });
    V.el('line', { x1: f.sx(lo), x2: f.sx(hi), y1: y, y2: y, class: 'ci' + (sig ? '' : ' gray') }, f.g);
    V.el('circle', { cx: f.sx(est), cy: y, r: 5.5, class: 'est' + (sig ? '' : ' gray') }, f.g);
    if (dotsVals) {
      const swg = V.el('g', { class: 'swarm' }, f.g), rng = E.mulberry32(5);
      dotsVals.forEach((v) => V.el('circle', { cx: (dotsSx || f.sx)(v), cy: y + 16 + (rng() * 2 - 1) * 9, r: 1.6 }, swg));
    }
  }
  App.registerDeck({
    id: 'cases', title: 'The three papers, case by case', short: 'The three cases', parent: 'papers', parentIdx: 0,
    slides: [
      {
        title: 'A binary outcome', stage: true,
        prose: `
          <p class="kicker">Side room · The three cases</p>
          <h2>Binary: the test that was one step away</h2>
          <p>Epitropaki and Avramidis (2024) ask whether early-career unemployment scars later leadership, and whether early-life disadvantage deepens the scar, in 9,915 respondents of two US youth surveys. Their analysis does everything current good practice asks: a probit, the extra machinery an endogenous employment gap needs (instruments and a control function), and effect curves across the moderator. What it lacks is the last step. Their moderation test is a contrast between two chosen points: the effect of a week of employment gap at two chosen levels of disadvantage, the 95th percentile against the mean, −0.9 points and significant.</p>
          <p>Add the interaction test itself, for the same joint change, and the AIE on the authors' own specification is −0.63 points on a markedly tighter interval: the moderation holds, a quarter smaller, because the two chosen points sit where the interaction runs stronger than it does for the average respondent. The dots are 1,500 of the respondents' own effects.</p>
`,
        caption: `One caveat the paper reports: the authors' first stages used only part of their instrument set. With the full set, neither their contrast nor the AIE stays significant (AIE −0.35 points, 95% interval −1.37 to +0.68), the cautious reading the authors themselves half-anticipated.`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const f = forest(svg, { min: -4, max: 6, left: 250, ticks: [-4, -2, 0, 2, 4, 6], fmt: (t) => (t < 0 ? '−' : t > 0 ? '+' : '') + Math.abs(t), xlabel: 'moderation estimate (percentage points), n = 9,915', title: 'Epitropaki & Avramidis (2024): gap × disadvantage', subtitle: 'per added week of employment gap; disadvantage moved by the contrast\'s own 1.526-unit span' });
          ciRow(f, 110, -0.88, -1.5, -0.3, 'contrast at two points, as published', true);
          ciRow(f, 190, -0.63, -0.98, -0.28, 'ginteff AIE, same change', true, D.lead_ies);
          V.text(f.g, 250, 246, 'individual effects for 1,500 of the 9,915 respondents, same change', 'label-muted');
          V.text(f.g, 250, 292, 'Blue: 95% interval excludes zero. Both on the authors\' own control function;', 'label-muted');
          V.text(f.g, 250, 308, 'the published contrast is −0.9 [−1.5, −0.3], reproduced here as −0.88.', 'label-muted');
        }
      },
      {
        title: 'An ordinal outcome', stage: true, gate: true, gateHint: 'Bet first',
        prose: (c) => `
          <p class="kicker">Side room · The three cases</p>
          <h2>Ordinal: where does the probability move?</h2>
          <p>Adler and Ayala-Hurtado (2025) run a factorial survey experiment: 1,536 respondents rate their agreement with a statement on a five-point scale, and three manipulated factors combine to shape it. The authors estimate the three-way interaction by ordered logit, find a positive, significant coefficient, and read it off a display of mean agreement by condition: roughly half a scale point of extra agreement.</p>
          <p><strong>A bet.</strong> The coefficient is positive and significant. Category by category, where does the interaction move the probability?</p>
          <div class="chips" id="papers1-chips"><button class="chip" type="button" data-bet="up">Mostly into "agree"</button><button class="chip" type="button" data-bet="both">Into both extremes</button><button class="chip" type="button" data-bet="even">Evenly up the scale</button></div>
          <div class="callout reveal" id="papers1-reveal"></div>`,
        below: `<div class="controls"><div class="toggle" id="papers1-t" role="group" aria-label="summary"><button type="button" data-v="mean" class="is-on" aria-pressed="true">the mean, as the authors read it</button><button type="button" data-v="cat" aria-pressed="false" disabled>category by category (ginteff)</button></div></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const cats = [{ k: 1, est: 0.1002, se: 0.0308 }, { k: 2, est: -0.0686, se: 0.0476 }, { k: 3, est: -0.3082, se: 0.0306 }, { k: 4, est: -0.1318, se: 0.0497 }, { k: 5, est: 0.4084, se: 0.0508 }];
          const layer = V.el('g', {}, svg);
          function drawMean() {
            layer.innerHTML = '';
            const sx = V.scale(1, 5, 80, 600);
            V.text(layer, 24, 32, 'Adler & Ayala-Hurtado (2025): the three-way interaction on mean agreement', 'label-strong');
            V.text(layer, 24, 50, 'estimation n = 1,536; a factorial design, so the effect is identical for every respondent', 'label-muted');
            V.axisX(layer, sx, 240, { ticks: [1, 2, 3, 4, 5], fmt: (t) => String(t), label: 'agreement scale (1 = strongly disagree, 5 = strongly agree)' });
            const a = 3.0, b = 3.55;
            V.el('line', { x1: sx(a), x2: sx(b), y1: 170, y2: 170, class: 'ci', style: 'stroke-width:6' }, layer);
            V.el('path', { d: 'M' + (sx(b) - 8) + ' 162 L' + sx(b) + ' 170 L' + (sx(b) - 8) + ' 178', fill: 'none', stroke: 'var(--blue)', 'stroke-width': 2.5 }, layer);
            V.text(layer, sx(3.275), 150, 'the interaction adds +0.55 of a scale point (SE 0.21)', 'label-blue', { 'text-anchor': 'middle' });
            V.text(layer, sx(1), 300, 'A modest shift right. Nothing says where on the scale it happens.', 'label-muted');
          }
          function drawCats() {
            layer.innerHTML = '';
            const sx = V.scale(0.5, 5.5, 80, 600), sy = V.scale(-0.5, 0.55, 320, 70);
            V.text(layer, 24, 32, 'The same interaction, on each category\'s probability (ginteff AIE, 95% CI)', 'label-strong');
            V.text(layer, 24, 50, 'zero-to-one changes over the factorial corners; blue: interval excludes zero', 'label-muted');
            V.axisX(layer, sx, 320, { ticks: [1, 2, 3, 4, 5], fmt: (t) => String(t), label: 'outcome category (1 = strongly disagree, 5 = strongly agree)' });
            V.axisY(layer, sy, 80, { ticks: [-0.4, -0.2, 0, 0.2, 0.4], fmt: (t) => (t < 0 ? '−' : t > 0 ? '+' : '') + Math.abs(Math.round(100 * t)) + ' pp', label: 'change in probability', labelDx: 54 });
            V.el('line', { x1: sx(0.5), x2: sx(5.5), y1: sy(0), y2: sy(0), class: 'zero soft' }, layer);
            cats.forEach((c) => {
              const sig = Math.abs(c.est) > 1.96 * c.se;
              const w = 46, x = sx(c.k) - w / 2;
              V.el('rect', { x: x, y: Math.min(sy(0), sy(c.est)), width: w, height: Math.abs(sy(c.est) - sy(0)), rx: 3, class: 'bar ' + (sig ? 'blue' : ''), opacity: sig ? 1 : .5 }, layer);
              V.el('line', { x1: sx(c.k), x2: sx(c.k), y1: sy(c.est - 1.96 * c.se), y2: sy(c.est + 1.96 * c.se), stroke: 'var(--ink)', 'stroke-width': 1.6 }, layer);
              V.text(layer, sx(c.k), sy(c.est) + (c.est > 0 ? -12 : 20), (c.est > 0 ? '+' : '−') + Math.round(Math.abs(100 * c.est)) + (sig ? '' : ' n.s.'), 'label-strong', { 'text-anchor': 'middle' });
            });
          }
          const tb = api.below.querySelectorAll('#papers1-t button');
          function setView(v) { tb.forEach((o) => { o.classList.toggle('is-on', o.getAttribute('data-v') === v); o.setAttribute('aria-pressed', o.getAttribute('data-v') === v ? 'true' : 'false'); }); if (v === 'mean') drawMean(); else drawCats(); }
          tb.forEach((b) => b.addEventListener('click', () => setView(b.getAttribute('data-v'))));
          drawMean();
          S.betChips(api, 'papers1-chips', 'both', (bet) => {
            tb[1].disabled = false; setView('cat');
            const r = document.getElementById('papers1-reveal');
            r.innerHTML = `${bet === 'both' ? 'Into both extremes.' : bet === 'up' ? 'You said mostly into "agree". It is stranger than that.' : 'You said evenly. It is the opposite of even.'} The interaction adds <strong>41 points</strong> to the probability of strong agreement and <strong>10 points</strong> to strong <em>disagreement</em>, while draining the middle (−31 and −13; one category indistinguishable from zero). The mean summary drifts half a point right; the categories polarise. The interaction is real, and its probability-scale expression lives at the extremes, where neither a coefficient nor a mean can see it. Toggle between the two summaries of the same fit.`;
            r.classList.add('is-open'); api.unlock();
          }, 'papers1-bet');
        }
      },
      {
        title: 'A fractional outcome', stage: true,
        prose: `
          <p class="kicker">Side room · The three cases</p>
          <h2>Share: one moderation robust, one fragile</h2>
          <p>Rangan and Sengul (2009) model how far 225 multinational firms integrate their operations across borders, a share between 0 and 1, and test whether information technology (IT) helps more in knowledge-intensive firms and in more international ones. Each moderation enters alone, then both together in the model the authors' discussion rests on. Every published coefficient is significant at the paper's own bar, a 10% one-tailed test, in the direction it happened to point: internationalization as hypothesised, knowledge intensity the other way, which the authors reported as not supported.</p>
          <p>Refitted as a fractional probit with the published instruments, the internationalization moderation clears the bar in both specifications and its AIE exceeds the rescaled coefficient. The knowledge moderation is null entered alone and significant entered jointly, a three-and-a-half-fold swing the coefficient never shows. Same coefficient verdict in every column, like the race; <strong>only the probability-scale test reveals that one moderation's evidence depends on the specification.</strong></p>
          <p style="margin-top:22px"><a class="door is-back" data-go="back" href="#">Back to the path</a></p>`,
        caption: `The refit changes two first-stage details the paper records, and keeps the published models' own inference convention. A bootstrap clustered on the fifteen industries widens every interval past zero; the split between the two moderations survives it.`,
        below: `<div class="controls"><div class="toggle" id="papers2-m" role="group" aria-label="moderation"><button type="button" data-m="know" class="is-on" aria-pressed="true">IT × knowledge intensity</button><button type="button" data-m="intl" aria-pressed="false">IT × internationalization</button></div><div class="toggle" id="papers2-t" role="group" aria-label="interval"><button type="button" data-v="80" class="is-on" aria-pressed="true">the paper's bar: 10% one-tailed</button><button type="button" data-v="95" aria-pressed="false">95% two-sided</button></div></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const rows = {
            know: { h: 'IT × knowledge intensity', hyp: 'Hypothesis 2 predicted a positive moderation; every estimate is negative', rows: [
              { lab: 'published 2SLS coefficient, rescaled', est: -0.0049, se: 0.0037265 },
              { lab: 'ginteff AIE', est: -0.0026, se: 0.0054949, dots: D.sengul_single.H2 },
              { lab: '2SLS, both interactions entered', est: -0.0094, se: 0.0037 },
              { lab: 'ginteff AIE, both interactions', est: -0.0091, se: 0.0045, dots: D.sengul_joint.H2 }] },
            intl: { h: 'IT × internationalization', hyp: 'Hypothesis 3 predicted a positive moderation; every estimate is positive', rows: [
              { lab: 'published 2SLS coefficient, rescaled', est: 0.0069, se: 0.0041166 },
              { lab: 'ginteff AIE', est: 0.0114, se: 0.0044683, dots: D.sengul_single.H3 },
              { lab: '2SLS, both interactions entered', est: 0.0118, se: 0.0048 },
              { lab: 'ginteff AIE, both interactions', est: 0.0154, se: 0.00507, dots: D.sengul_joint.H3 }] }
          };
          const layer = V.el('g', {}, svg);
          let mod = 'know', level = '80';
          function draw() {
            layer.innerHTML = '';
            const z = level === '95' ? 1.96 : 1.2815516;
            const f = { g: layer, sx: V.scale(-0.025, 0.03, 250, 600) };
            const R = rows[mod];
            V.text(layer, 24, 30, 'Rangan & Sengul (2009), n = 225: ' + R.h, 'label-strong');
            V.text(layer, 24, 48, R.hyp, 'label-muted');
            V.text(layer, 24, 66, (level === '95' ? '95% two-sided intervals' : 'the paper\'s own bar: 10% one-tailed, 80% two-sided') + '; joint one-SD changes', 'label-muted');
            V.axisX(layer, f.sx, 340, { ticks: [-0.02, -0.01, 0, 0.01, 0.02, 0.03], fmt: (t) => (t < 0 ? '−' : t > 0 ? '+' : '') + Math.abs(t).toFixed(2).replace('0.', '.'), label: 'interaction effect on the integration share' });
            V.el('line', { x1: f.sx(0), x2: f.sx(0), y1: 80, y2: 340, class: 'zero soft' }, layer);
            V.text(layer, 250, 98, 'entered alone', 'label-muted'); V.text(layer, 250, 226, 'entered together (the authors\' Model 5)', 'label-muted');
            R.rows.forEach((r, k) => {
              const y = 118 + (k % 2) * 44 + (k >= 2 ? 128 : 0);
              const sig = Math.abs(r.est) > z * r.se;
              ciRow(f, y, r.est, r.est - z * r.se, r.est + z * r.se, r.lab, sig, r.dots || null);
            });
          }
          const setToggle = (id, attr, val) => api.below.querySelectorAll('#' + id + ' button').forEach((o) => { const on = o.getAttribute(attr) === val; o.classList.toggle('is-on', on); o.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          api.below.querySelectorAll('#papers2-m button').forEach((b) => b.addEventListener('click', () => { mod = b.getAttribute('data-m'); setToggle('papers2-m', 'data-m', mod); draw(); }));
          api.below.querySelectorAll('#papers2-t button').forEach((b) => b.addEventListener('click', () => { level = b.getAttribute('data-v'); setToggle('papers2-t', 'data-v', level); draw(); }));
          draw();
        }
      }
    ]
  });

  // ======================================================================
  // 12–13 — now
  // ======================================================================
  App.registerDeck({
    id: 'now', title: 'Now you', short: 'What to do',
    slides: [
      {
        title: 'Five things to do, two questions', layout: 'prose', nextLabel: 'One last thing',
        prose: `
          <p class="kicker">What to do</p>
          <h2>Five things to do, and two questions for reviewers</h2>
          <ol class="recs">
            <li><strong>State the hypothesis as a quantity on the outcome's scale.</strong> A claim about success, failure or hiring is a claim about probabilities; name the number that carries the test before estimating anything. <span class="you">the difference between two brackets</span></li>
            <li><strong>Estimate the model the outcome calls for.</strong> Choosing a straight line <em>because</em> interactions are hard to read in a logit inverts the logic of model choice. <span class="you">the interval that tightened around the wrong number</span></li>
            <li><strong>Test the hypothesis with the interaction effect, not the coefficient.</strong> One line after estimation; report it in percentage points with its interval. <span class="you">you watched β<sub>3</sub> find the zero</span></li>
            <li><strong>Let plots illustrate; never let them test.</strong> The fanning of two lines is driven by curvature and the window as much as by moderation. <span class="you">you saw the window slide</span></li>
            <li><strong>Then show where the effect lives.</strong> The average carries the test. Beside it, report the effect at moderator values you state in advance, or category by category. <span class="you">the ratings that polarised</span></li>
          </ol>
          <div class="callout"><p style="margin:0 0 6px"><strong>Reviewing a paper? Two questions.</strong></p><p style="margin:0 0 6px">1. Is an inferential statistic reported for the interaction effect on the outcome's scale, not a coefficient, an odds ratio, or a plot?</p><p style="margin:0">2. Does the conclusion follow from that quantity's sign and confidence interval?</p></div>
          <p class="small">In the paper's review of the 202 studies, 5% could answer yes to the first. <a class="door" data-go="field/0" href="#field/0">What the 202 did</a> <a class="door" data-go="panel/0" href="#panel/0">Panels and fixed effects</a></p>`
      },
      {
        title: 'The end, which is a question', layout: 'hero',
        prose: `
          <p class="kicker">Now you</p>
          <h1>Think of the last interaction you reported, or reviewed.</h1>
          <p>You stood on the curve, watched a coefficient lie in both directions, saw the window fool the eye, and saw the shortcuts fail where the average interaction effect holds. <strong>What would that interaction say if the effect itself were tested?</strong> It is one line to find out.</p>
          <div class="cta">
            <a class="btn btn-primary btn-lg" href="https://github.com/jespernwulff/ginteff" target="_blank" rel="noopener">The ginteff R package</a>
            <button class="btn btn-lg" type="button" data-go="sandbox/0">Try your own design</button>
            <button class="btn btn-ghost btn-lg" type="button" id="end-map">Open the map</button>
          </div>
          <p class="deeper"><span class="lbl">Go deeper, a minute or two each</span>
            <a class="door" data-go="window/0" href="#window/0">Inside the plot</a>
            <a class="door" data-go="gallery/0" href="#gallery/0">Five more processes</a>
            <a class="door" data-go="formula/0" href="#formula/0">The formula</a>
            <a class="door" data-go="others/0" href="#others/0">The other remedies</a>
            <a class="door" data-go="families/0" href="#families/0">Beyond yes/no</a>
            <a class="door" data-go="lpm/0" href="#lpm/0">Where the straight line bends</a>
            <a class="door" data-go="designs/0" href="#designs/0">All 174 designs</a>
            <a class="door" data-go="panel/0" href="#panel/0">Panels and fixed effects</a>
            <a class="door" data-go="cases/0" href="#cases/0">The three cases</a>
            <a class="door" data-go="field/0" href="#field/0">What the 202 did</a></p>
          <p class="small muted" style="margin-top:18px">Built on: Wulff, J. N. (2026). <em>From improvised to standardized: testing interaction effects in logit, probit, and other nonlinear models.</em> Stata: <code>ginteff</code> (Radean, 2023, Stata Journal). Every simulation number here is from the paper's own runs; every playable runs the paper's data-generating process in your browser.</p>`,
        mount: function (api) { S.heroCurve(api, { end: true }); const b = api.prose.querySelector('#end-map'); if (b) b.addEventListener('click', () => App.openMap()); }
      }
    ]
  });

  // ---------- side room: the sandbox ----------
  App.registerDeck({
    id: 'sandbox', title: 'The sandbox', short: 'The sandbox', parent: 'now', parentIdx: 1,
    slides: [
      {
        title: 'Sandbox', stage: true, layout: 'stack', proseFirst: true,
        prose: `
          <h2 style="margin:0 0 8px">The sandbox: try to make the coefficient lie. Try to make the AIE lie.</h2>
          <p style="margin-bottom:6px">Left: the two-line plot of the population you configure. Right: every firm's true interaction effect and the true average (dashed). <strong>Draw a sample and fit</strong> fits the model and a linear model to it and reports what each practice would say; <strong>draw 20</strong> keeps score, the way the race did. "Solve β<sub>3</sub>" sets the coefficient so the true average effect is exactly zero.</p>`,
        below: `<div class="controls consoles">
            <fieldset class="console"><legend>the world</legend>
            <div class="control"><label for="sb-it">interaction</label><select id="sb-it"><option value="cxc">continuous × continuous</option><option value="bxc">binary × continuous</option></select></div>
            <div class="control"><label for="sb-link">link</label><select id="sb-link"><option value="probit">probit</option><option value="logit">logit</option></select></div>
            <div class="control"><label for="sb-base">base rate</label><select id="sb-base"><option>0.02</option><option>0.06</option><option selected>0.17</option><option>0.5</option></select></div>
            <div class="control"><label for="sb-skx">skewness of x</label><select id="sb-skx"><option>0</option><option>1</option><option selected>2</option><option>4</option></select></div>
            <div class="control"><label for="sb-px">P(x = 1)</label><select id="sb-px"><option>0.1</option><option selected>0.5</option></select></div>
            <div class="control"><label for="sb-skz">skewness of z</label><select id="sb-skz"><option selected>0</option><option>2</option></select></div>
            <div class="control"><label for="sb-n">sample size</label><select id="sb-n"><option>500</option><option selected>1500</option><option>7500</option></select></div>
            </fieldset>
            <fieldset class="console index-panel"><legend>the model, on the index</legend>
            <div class="control" style="min-width:150px"><label for="sb-b1">β<sub>1</sub> (x)</label><input id="sb-b1" class="latent" type="range" min="0" max="1.2" step="0.05" value="0.35"><span class="val" id="sb-b1v"></span></div>
            <div class="control" style="min-width:150px"><label for="sb-b2">β<sub>2</sub> (z)</label><input id="sb-b2" class="latent" type="range" min="0" max="1.2" step="0.05" value="0.35"><span class="val" id="sb-b2v"></span></div>
            <div class="control" style="min-width:190px"><label for="sb-b3">β<sub>3</sub> (x·z)</label><input id="sb-b3" class="latent" type="range" min="-0.6" max="0.6" step="0.005" value="0"><span class="val" id="sb-b3v"></span></div>
            <button class="btn" type="button" id="sb-solve">Solve β<sub>3</sub> for a true zero</button>
            </fieldset>
            <div class="console actions">
            <button class="btn btn-primary" type="button" id="sb-fit">Draw a sample and fit</button>
            <button class="btn" type="button" id="sb-fit20">Draw 20</button>
            <div class="control"><label for="sb-preset">preset</label><select id="sb-preset"><option value="">choose…</option><option value="race">the race design (skew 2, base .17, true zero)</option><option value="mech">the process from the coefficient and plot stages (main effects .8, true zero)</option><option value="fig1e">Figure 1(e): skew 4, base .50</option><option value="sym50">symmetric, base .50 (linear model +150%)</option><option value="bxc">binary × continuous, P(x = 1) = .5</option></select></div>
            </div>
          </div>
          <div id="sb-results" class="small"></div>
          <div id="sb-tally" class="small"></div>
          <p class="small muted">Population of 6,000 firms, base rate held by re-solving the intercept, controls as in the paper; the sandbox always fits the right link, so the AIE's only way to "lie" is the one in twenty its 95% interval is allowed (the paper's misspecification arm probes the wrong link, and the AIE holds there too). Presets reproduce designs from the paper's Figure 1 and from the race; the paper's own runs used 1,000 samples per design.</p>`,
        mount: function (api) {
          const svg = V.svg(api.stage, 1000, 400);
          const q = (id) => api.below.querySelector(id);
          const left = V.el('g', {}, svg), right = V.el('g', {}, svg);
          const sxL = V.scale(-1, 1, 70, 460), syL = V.scale(0, 1, 320, 50);
          const sxR = V.scale(-0.25, 0.25, 560, 960);
          const axL = V.el('g', {}, left);
          V.axisY(left, syL, 70, { ticks: [0, .25, .5, .75, 1], fmt: (t) => t === 0 ? '0' : t === 1 ? '1' : t.toFixed(2).replace(/^0/, ''), label: 'Pr(y = 1)', labelDx: 46 });
          V.axisX(right, sxR, 330, { ticks: [-0.2, -0.1, 0, 0.1, 0.2], fmt: (t) => (t < 0 ? '−' : t > 0 ? '+' : '') + Math.abs(Math.round(100 * t)) + ' pp', label: 'interaction effect (percentage points)' });
          V.text(left, 70, 34, 'Two-line plot (population)', 'label-strong');
          V.text(right, 560, 34, 'True effects, one dot per firm', 'label-strong');
          const cLo = V.el('path', { class: 'curve' }, left), cHi = V.el('path', { class: 'curve dashed' }, left);
          const gapT = V.text(left, 70, 52, '', 'label-muted');
          const swg = V.el('g', { class: 'swarm' }, right);
          const dots = []; const rng = E.mulberry32(3); const jit = [];
          for (let i = 0; i < 1000; i++) { jit.push((rng() * 2 - 1) * 60); dots.push(V.el('circle', { r: 2, cx: sxR(0), cy: 250 + jit[i] }, swg)); }
          const clampNote = V.text(right, 960, 320, '', 'label-muted', { 'text-anchor': 'end' });
          const truthL = V.el('line', { class: 'truth', y1: 60, y2: 330 }, right), truthT = V.text(right, 0, 56, '', 'label-strong', { 'text-anchor': 'middle' });
          const estG = V.el('g', {}, right);
          let pop = null, spec = null, beta = null, Lk = E.probit, seed = 1;
          const tally = { m: 0, coef: 0, plot: 0, lpm: 0, lpmCov: 0, aie: 0, aieCov: 0 };
          function readSpec() {
            const it = q('#sb-it').value;
            spec = { intType: it, skewX: it === 'cxc' ? +q('#sb-skx').value : 0, skewZ: +q('#sb-skz').value, px: it === 'cxc' ? null : +q('#sb-px').value, link: q('#sb-link').value, base: +q('#sb-base').value };
            q('#sb-skx').parentElement.hidden = it !== 'cxc'; q('#sb-px').parentElement.hidden = it === 'cxc';
            Lk = E.link(spec.link);
            pop = App.model('sbpop_' + it + '_' + spec.skewX + '_' + spec.skewZ + '_' + spec.px, () => E.makePop(spec, 6000, 88));
            const b = E.defaultBeta(); b.bx = +q('#sb-b1').value; b.bz = +q('#sb-b2').value; b.b3 = +q('#sb-b3').value;
            beta = E.solveB0(pop, b, Lk, spec.base);
            q('#sb-b1v').textContent = b.bx.toFixed(2); q('#sb-b2v').textContent = b.bz.toFixed(2); q('#sb-b3v').textContent = (b.b3 >= 0 ? '+' : '−') + Math.abs(b.b3).toFixed(3);
          }
          function resetTally() { Object.keys(tally).forEach((k) => { tally[k] = 0; }); q('#sb-tally').innerHTML = ''; }
          function drawPop() {
            readSpec(); resetTally();
            axL.innerHTML = '';
            const xs = []; for (let x = -1; x <= 1.0001; x += 0.1) xs.push(+x.toFixed(2));
            let hi, lo;
            if (pop.binX) {
              V.axisX(axL, sxL, 330, { ticks: [-1, -0.5, 0, 0.5, 1], fmt: (t) => (t > 0 ? '+' : '') + t, label: 'z (SD units), window mean ± 1 SD; lines: x = 1 (dashed), x = 0 (solid)' });
              hi = xs.map((zv) => E.meanP(pop, beta, Lk, 1, zv, 3)); lo = xs.map((zv) => E.meanP(pop, beta, Lk, 0, zv, 3));
            } else {
              V.axisX(axL, sxL, 330, { ticks: [-1, -0.5, 0, 0.5, 1], fmt: (t) => (t > 0 ? '+' : '') + t, label: 'x (SD units), window mean ± 1 SD; lines: z = +1 SD (dashed), −1 SD (solid)' });
              hi = E.twoLine(pop, beta, Lk, 1, xs, 3); lo = E.twoLine(pop, beta, Lk, -1, xs, 3);
            }
            cLo.setAttribute('d', V.path(xs.map((x, i) => [sxL(x), syL(lo[i])]))); cHi.setAttribute('d', V.path(xs.map((x, i) => [sxL(x), syL(hi[i])])));
            const g0 = hi[0] - lo[0], g1 = hi[hi.length - 1] - lo[lo.length - 1];
            gapT.textContent = 'gap ' + Math.round(100 * g0) + ' pp → ' + Math.round(100 * g1) + ' pp: the eye says ' + (g1 > g0 ? '"positive"' : '"negative"');
            const ie = E.ieVector(pop, beta, Lk), aie = E.aieDD(pop, beta, Lk);
            const stride = Math.ceil(pop.N / 1000); let clamped = 0;
            for (let i = 0, k = 0; i < pop.N && k < 1000; i += stride, k++) { if (Math.abs(ie[i]) > 0.25) clamped++; dots[k].setAttribute('cx', sxR(V.clamp(ie[i], -0.25, 0.25))); dots[k].setAttribute('class', ie[i] > 0 ? 'pos' : 'neg'); }
            clampNote.textContent = clamped ? clamped + ' of 1,000 dots beyond the axis' : '';
            truthL.setAttribute('x1', sxR(aie)); truthL.setAttribute('x2', sxR(aie)); truthT.setAttribute('x', V.clamp(sxR(aie), 620, 900)); truthT.textContent = 'true AIE ' + V.fmtPP(aie);
            estG.innerHTML = ''; q('#sb-results').innerHTML = '';
            return aie;
          }
          function heuristic(d, f) {
            const b = { b0: f.beta[0], bx: f.beta[1], bz: f.beta[2], b3: f.beta[3], gw1: f.beta[4], gw2: f.beta[5] };
            if (d.binX) { const gap = (zv) => E.meanP(d, b, Lk, 1, zv, 2) - E.meanP(d, b, Lk, 0, zv, 2); const ch = gap(1) - gap(-1); return { change: ch, declares: Math.abs(ch) > 0.01 }; }
            return E.plotHeuristic(d, f, Lk, 0.01);
          }
          function fitOne(report) {
            const n = +q('#sb-n').value;
            const d = E.drawSample(spec, n, beta, Lk, seed++);
            const f = E.fitBinary(d, Lk);
            if (!f.converged || !f.se) { if (report) q('#sb-results').innerHTML = '<span style="color: var(--alarm)">The fit did not converge on this sample (rare events or separation). Draw again.</span>'; return null; }
            const pCoef = E.pValue(f.beta[3] / f.se[3]);
            const a = E.aieDelta(d, f, Lk);
            const o = E.ols(d, d.y); const pL = E.pValue(o.beta[3] / o.se[3]);
            const ph = heuristic(d, f);
            const truth = E.aieDD(pop, beta, Lk);
            const lpmLo = o.beta[3] - 1.96 * o.se[3], lpmHi = o.beta[3] + 1.96 * o.se[3];
            const res = { n: n, f: f, pCoef: pCoef, a: a, o: o, pL: pL, ph: ph, truth: truth, lpmCov: !(lpmLo > truth || lpmHi < truth), aieCov: !(a.lo > truth || a.hi < truth) };
            tally.m++; if (pCoef < .05) tally.coef++; if (ph.declares) tally.plot++; if (pL < .05) tally.lpm++; if (res.lpmCov) tally.lpmCov++; if (a.p < .05) tally.aie++; if (res.aieCov) tally.aieCov++;
            return res;
          }
          function show(res) {
            const a = res.a, o = res.o, f = res.f, truth = res.truth;
            estG.innerHTML = '';
            [{ y: 110, lab: 'ginteff AIE', est: a.aie, lo: a.lo, hi: a.hi, cls: 'aie', cov: res.aieCov }, { y: 150, lab: 'linear model', est: o.beta[3], lo: o.beta[3] - 1.96 * o.se[3], hi: o.beta[3] + 1.96 * o.se[3], cls: 'lpm', cov: res.lpmCov }].forEach((r) => {
              V.text(estG, sxR.r0 - 6, r.y + 4, r.lab, 'label-strong', { 'text-anchor': 'end' });
              V.el('line', { x1: sxR(V.clamp(r.lo, -0.25, 0.25)), x2: sxR(V.clamp(r.hi, -0.25, 0.25)), y1: r.y, y2: r.y, class: 'ci', style: 'stroke: ' + (r.cov ? 'var(--c-' + r.cls + ')' : 'var(--alarm)') }, estG);
              V.el('circle', { cx: sxR(V.clamp(r.est, -0.25, 0.25)), cy: r.y, r: 5, class: 'est', style: 'fill: ' + (r.cov ? 'var(--c-' + r.cls + ')' : 'var(--alarm)') }, estG);
            });
            const verdict = (s) => s ? '<span class="verdict pos">declares moderation</span>' : '<span class="verdict" style="background: var(--gray-soft)">no moderation</span>';
            const cov = (c) => c ? 'interval covers the truth' : '<span style="color: var(--alarm)">interval misses the truth</span>';
            q('#sb-results').innerHTML = `<table class="tbl"><thead><tr><th>practice, on this sample of ${V.fmtN(res.n)}</th><th>what it reports</th><th>verdict</th><th>true average effect: ${V.fmtPP(truth, 2)}</th></tr></thead><tbody>
              <tr class="latent-row"><td>${sw('coef')}product-term coefficient</td><td class="num">${V.fmtSigned(f.beta[3], 3)} (${V.fmtP(res.pCoef)})</td><td>${verdict(res.pCoef < .05)}</td><td>on the latent scale; not comparable to the truth</td></tr>
              <tr><td>${sw('plot')}two-line plot</td><td class="num">gap changes by ${V.fmtPP(res.ph.change)}</td><td>${verdict(res.ph.declares)}</td><td class="muted">window mean ± 1 SD, threshold 1 pp</td></tr>
              <tr><td>${sw('lpm')}linear probability model</td><td class="num">${V.fmtPP(o.beta[3], 2)} [${V.fmtPP(o.beta[3] - 1.96 * o.se[3], 2)}, ${V.fmtPP(o.beta[3] + 1.96 * o.se[3], 2)}]</td><td>${verdict(res.pL < .05)}</td><td>${cov(res.lpmCov)}</td></tr>
              <tr class="hl"><td>${sw('aie')}ginteff AIE</td><td class="num">${V.fmtPP(a.aie, 2)} [${V.fmtPP(a.lo, 2)}, ${V.fmtPP(a.hi, 2)}]</td><td>${verdict(a.p < .05)}</td><td>${cov(res.aieCov)}</td></tr></tbody></table>`;
            q('#sb-fit').textContent = 'Draw again';
            showTally();
          }
          function showTally() {
            if (!tally.m) { q('#sb-tally').innerHTML = ''; return; }
            const t = tally, f = (k) => Math.round(100 * t[k] / t.m) + '%';
            q('#sb-tally').innerHTML = `<div class="readout"><div class="r"><span class="k">score, ${t.m} draw${t.m > 1 ? 's' : ''}</span><span class="v">declares moderation:</span></div><div class="r"><span class="k">${sw('coef')}coefficient</span><span class="v">${f('coef')}</span></div><div class="r"><span class="k">${sw('plot')}plot</span><span class="v">${f('plot')}</span></div><div class="r"><span class="k">${sw('lpm')}linear</span><span class="v">${f('lpm')} · covers truth ${f('lpmCov')}</span></div><div class="r"><span class="k">${sw('aie')}AIE</span><span class="v">${f('aie')} · covers truth ${f('aieCov')}</span></div></div>`;
          }
          function fit() { readSpec(); const res = fitOne(true); if (res) show(res); }
          function fit20() {
            readSpec(); const btn = q('#sb-fit20'); btn.disabled = true; let k = 0, last = null;
            const step = () => { for (let j = 0; j < 4 && k < 20; j++, k++) { const r = fitOne(false); if (r) last = r; } if (k < 20) setTimeout(step, 0); else { btn.disabled = false; if (last) show(last); } };
            setTimeout(step, 0);
          }
          ['#sb-it', '#sb-link', '#sb-base', '#sb-skx', '#sb-px', '#sb-skz', '#sb-n'].forEach((id) => q(id).addEventListener('change', drawPop));
          ['#sb-b1', '#sb-b2', '#sb-b3'].forEach((id) => q(id).addEventListener('input', drawPop));
          q('#sb-solve').addEventListener('click', () => { readSpec(); const s = E.solveB3(pop, Object.assign({}, beta), Lk, spec.base, 0); const b3 = s.b3; const inp = q('#sb-b3'); if (Math.abs(b3) > 0.6) { inp.min = -Math.ceil(Math.abs(b3) * 10) / 10; inp.max = -inp.min; } inp.value = b3.toFixed(3); drawPop(); });
          q('#sb-fit').addEventListener('click', fit);
          q('#sb-fit20').addEventListener('click', fit20);
          q('#sb-preset').addEventListener('change', () => {
            const p = q('#sb-preset').value; if (!p) return;
            const set = (id, v) => { q(id).value = v; };
            set('#sb-it', p === 'bxc' ? 'bxc' : 'cxc'); set('#sb-link', 'probit');
            if (p === 'race') { set('#sb-base', '0.17'); set('#sb-skx', '2'); set('#sb-skz', '0'); set('#sb-b1', 0.35); set('#sb-b2', 0.35); drawPop(); q('#sb-solve').click(); }
            if (p === 'mech') { set('#sb-base', '0.17'); set('#sb-skx', '0'); set('#sb-skz', '0'); set('#sb-b1', 0.8); set('#sb-b2', 0.8); drawPop(); q('#sb-solve').click(); }
            if (p === 'fig1e') { set('#sb-base', '0.5'); set('#sb-skx', '4'); set('#sb-skz', '0'); set('#sb-b1', 0.35); set('#sb-b2', 0.35); set('#sb-b3', 0.119); drawPop(); }
            if (p === 'sym50') { set('#sb-base', '0.5'); set('#sb-skx', '0'); set('#sb-skz', '0'); set('#sb-b1', 0.35); set('#sb-b2', 0.35); set('#sb-b3', 0.085); drawPop(); }
            if (p === 'bxc') { set('#sb-base', '0.17'); set('#sb-px', '0.5'); set('#sb-skz', '0'); set('#sb-b1', 0.35); set('#sb-b2', 0.35); set('#sb-b3', 0); drawPop(); }
          });
          drawPop();
        }
      },
    ]
  });
})();
