/* decks_side.js — six of the side rooms: formula, gallery, lpm (with the old `linear` stage in front),
   others, families, panel. The rooms `window`, `designs`, `cases` and `sandbox` live beside their helpers
   in decks.js and decks2.js. Every room is optional and ends with a way back. */
(function () {
  'use strict';
  const E = Engine, L = E.probit, V = App.V, D = window.SIMDATA, S = App.shared;
  const W = 640, H = 400;
  const back = (label) => `<p style="margin-top:26px"><a class="door is-back" data-go="back" href="#">${label || 'Back to the path'}</a></p>`;
  const tick = (t, d) => (t < 0 ? '−' : t > 0 ? '+' : '') + Math.abs(t).toFixed(d == null ? 0 : d);

  function deltaOf(fit, fn) {
    const est = fn(fit.beta), p = fit.beta.length, grad = [];
    for (let a = 0; a < p; a++) {
      const h = 1e-5 * Math.max(1, Math.abs(fit.beta[a]));
      const bp = fit.beta.slice(), bm = fit.beta.slice(); bp[a] += h; bm[a] -= h;
      grad.push((fn(bp) - fn(bm)) / (2 * h));
    }
    let v = 0;
    for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) v += grad[a] * fit.vcov[a][c] * grad[c];
    const se = Math.sqrt(Math.max(v, 0));
    return { est: est, se: se, lo: est - 1.96 * se, hi: est + 1.96 * se, p: E.pValue(se > 0 ? est / se : 0) };
  }


  // ======================================================================
  // formula — the decomposition
  // ======================================================================
  App.registerDeck({
    id: 'formula', title: 'The formula that says why', short: 'The formula', parent: 'coef', parentIdx: 1,
    slides: [
      {
        title: 'Two terms', stage: true,
        prose: `
          <p class="kicker">Side room · The formula</p>
          <h2>Differentiate twice and the difficulty shows itself</h2>
          <p>With E(y) = G(η) and η = β<sub>0</sub> + β<sub>1</sub>x + β<sub>2</sub>z + β<sub>3</sub>xz + controls, the interaction effect for continuous x and z is</p>
          <div class="index-panel" style="margin:8px 0 14px"><span class="lbl">the cross-partial</span>∂²E(y)/∂x∂z = <span class="hl">β<sub>3</sub>·G′(η)</span> + <span style="color:#7FD1AE">(β<sub>1</sub> + β<sub>3</sub>z)(β<sub>2</sub> + β<sub>3</sub>x)·G″(η)</span></div>
          <p>The first term is the coefficient scaled by the slope of the curve. The second is absent from any linear model: an interaction produced purely by the curvature of G. It is nonzero when β<sub>3</sub> = 0, it depends on where the firm stands, and because G″ changes sign as the index crosses zero, it can flip the sign of the whole effect. <strong>Drag the firm along the index</strong> (a firm with x = 0.3 and z = −0.2, moved by its other characteristics) and watch the two terms.</p>` + back(),
        below: `<div class="index-panel attached"><div class="controls"><div class="control" style="min-width:220px"><label for="fm-eta">position on the index (or drag)</label><input id="fm-eta" class="latent" type="range" min="-4" max="4" step="0.05" value="-0.8"></div><div class="control" style="min-width:200px"><label for="fm-b3">β<sub>3</sub></label><input id="fm-b3" class="latent" type="range" min="-0.6" max="0.6" step="0.01" value="0"><span class="val" id="fm-b3v"></span></div></div></div><div class="readout"><div class="r"><span class="k">coefficient term</span><span class="v" id="fm-t1" style="color: var(--c-coef)"></span></div><div class="r"><span class="k">curvature term</span><span class="v" id="fm-t2" style="color: var(--green)"></span></div><div class="r"><span class="k">interaction effect here</span><span class="v blue" id="fm-tot"></span></div></div></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const sx = V.scale(-4, 4, 70, 600);
          const g = V.el('g', {}, svg);
          const panels = [
            { lab: 'G(η): the curve', f: L.G, y0: 40, y1: 130, lo: 0, hi: 1 },
            { lab: 'G′(η): its slope', f: L.g, y0: 150, y1: 230, lo: 0, hi: 0.42 },
            { lab: 'G″(η): its curvature, sign changes at 0', f: L.gp, y0: 250, y1: 330, lo: -0.26, hi: 0.26 }
          ];
          panels.forEach((p) => {
            p.sy = V.scale(p.lo, p.hi, p.y1, p.y0);
            V.text(g, 72, p.y0 - 6, p.lab, 'label-muted');
            V.el('line', { x1: sx.r0, x2: sx.r1, y1: p.sy(0), y2: p.sy(0), stroke: 'var(--rule)' }, g);
            const pts = []; for (let e = -4; e <= 4.001; e += 0.1) pts.push([sx(e), p.sy(p.f(e))]);
            V.el('path', { d: V.path(pts), class: 'curve thin' }, g);
            p.dot = V.el('circle', { class: 'dot', r: 5 }, g);
          });
          V.axisX(g, sx, 340, { ticks: [-4, -2, 0, 2, 4], fmt: (t) => tick(t), label: 'the index η' });
          const vl = V.el('line', { class: 'window-edge', y1: 34, y2: 340 }, g);
          const hit = V.el('rect', { x: 0, y: 0, width: W, height: H, class: 'hit drag' }, svg);
          let e0 = -0.8; const b1 = 0.8, b2 = 0.8, x = 0.3, z = -0.2;
          const b3in = api.below.querySelector('#fm-b3'), etaIn = api.below.querySelector('#fm-eta');
          function draw() {
            const b3 = parseFloat(b3in.value);
            api.below.querySelector('#fm-b3v').textContent = tick(b3, 2);
            panels.forEach((p) => { p.dot.setAttribute('cx', sx(e0)); p.dot.setAttribute('cy', p.sy(p.f(e0))); });
            vl.setAttribute('x1', sx(e0)); vl.setAttribute('x2', sx(e0));
            const t1 = b3 * L.g(e0), t2 = (b1 + b3 * z) * (b2 + b3 * x) * L.gp(e0);
            api.below.querySelector('#fm-t1').textContent = V.fmtSigned(t1, 3);
            api.below.querySelector('#fm-t2').textContent = V.fmtSigned(t2, 3);
            api.below.querySelector('#fm-tot').textContent = V.fmtSigned(t1 + t2, 3);
            etaIn.value = e0.toFixed(2);
          }
          api.onCleanup(V.drag(svg, hit, (p) => { e0 = V.clamp(sx.inv(p.x), -4, 4); draw(); }));
          etaIn.addEventListener('input', () => { e0 = parseFloat(etaIn.value); draw(); });
          b3in.addEventListener('input', draw);
          draw();
        }
      },
    ]
  });

  // ======================================================================
  // gallery — Figure 1's five processes
  // ======================================================================
  const CASES = [
    { tag: 'a', name: 'Agreement', b: [-0.20, .55, .40, .60], ctrl: false },
    { tag: 'b', name: 'Magnitude mismatch', b: [2.50, .55, .40, .80], ctrl: false },
    { tag: 'c', name: 'Sign mismatch', b: [1.20, .80, .80, .15], ctrl: false },
    { tag: 'd', name: 'Significance mismatch', b: [-0.90, .70, .70, .00], ctrl: false },
    { tag: 'e', name: 'Approximation mismatch', b: null, ctrl: true }
  ];
  function galleryCase(k) {
    return App.model('gallery' + k, () => {
      const c = CASES[k];
      let spec, beta, pop;
      if (!c.ctrl) {
        spec = { intType: 'cxc', skewX: 0, skewZ: 0, link: 'probit', base: null };
        pop = E.makePop(spec, 10000, 88 + k);
        beta = { b0: c.b[0], bx: c.b[1], bz: c.b[2], b3: c.b[3], gw1: 0, gw2: 0 };
      } else {
        spec = { intType: 'cxc', skewX: 4, skewZ: 0, link: 'probit', base: 0.5 };
        pop = E.makePop(spec, 10000, 88 + k);
        const base = E.aieDD(pop, E.solveB0(pop, E.defaultBeta(), L, 0.5), L);
        beta = E.solveB3(pop, E.defaultBeta(), L, 0.5, base + 0.03);
      }
      const truth = E.aieCP(pop, beta, L);
      const lpmLimit = E.lpmPlim(pop, beta, L);
      const d = E.drawSample(spec, 5000, beta, L, 20260519 + k);
      const fit = E.fitBinary(d, L);
      const pCoef = E.pValue(fit.beta[3] / fit.se[3]);
      const aie = deltaOf(fit, (bv) => { const bb = { b0: bv[0], bx: bv[1], bz: bv[2], b3: bv[3], gw1: bv[4], gw2: bv[5] }; return E.aieCP(d, bb, L); });
      const o = E.ols(d, d.y);
      const lpm = { est: o.beta[3], lo: o.beta[3] - 1.96 * o.se[3], hi: o.beta[3] + 1.96 * o.se[3] };
      const zs = Array.from(pop.z).sort((a, b) => a - b), z5 = zs[Math.floor(0.05 * zs.length)], z95 = zs[Math.floor(0.95 * zs.length)];
      const xs = []; for (let x = -2.5; x <= 2.5001; x += 0.1) xs.push(+x.toFixed(2));
      const lo = E.twoLine(pop, beta, L, z5, xs, 4), hi = E.twoLine(pop, beta, L, z95, xs, 4);
      return { c: c, truth: truth, lpmLimit: lpmLimit, fit: fit, pCoef: pCoef, aie: aie, lpm: lpm, xs: xs, lo: lo, hi: hi, b3: beta.b3 };
    });
  }
  function galleryNote(k, m) {
    const a = galleryCase(0);
    const pctOff = (v) => Math.round(100 * Math.abs(v - m.truth) / Math.abs(m.truth));
    switch (k) {
      case 0: return 'All three quantities agree with the truth. Common practice is harmless here.';
      case 1: return 'The coefficient is ' + Math.round(100 * (m.fit.beta[3] / a.fit.beta[3] - 1)) + '% larger than in (a), while the true effect is ' + Math.round(100 * (1 - m.truth / a.truth)) + '% smaller. Ranking the two interactions by their coefficients gets the order backward.';
      case 2: return 'The coefficient is positive (' + V.fmtSigned(m.fit.beta[3], 2) + ', ' + V.fmtP(m.pCoef) + '); the true effect is negative. Not even the sign is safe.';
      case 3: return 'The true β₃ is exactly zero and the fitted coefficient is ' + V.fmtSigned(m.fit.beta[3], 2) + ' (' + V.fmtP(m.pCoef) + '); the true effect is positive and both probability-scale estimates find it.';
      default: return 'With a skewed focal variable at a base rate of one half, the linear model misses the true effect by ' + pctOff(m.lpm.est) + '% in this draw and by ' + Math.round(100 * Math.abs(m.lpmLimit - m.truth) / Math.abs(m.truth)) + '% in the population limit; the AIE recovers it.';
    }
  }
  App.registerDeck({
    id: 'gallery', title: 'Five processes where they disagree', short: 'Five processes', parent: 'coef', parentIdx: 1,
    slides: [
      {
        title: 'The gallery', stage: true,
        prose: (ctx) => `
          <p class="kicker">Side room · Five processes</p>
          <h2>Five probit processes, each fitted to a fresh sample of 5,000</h2>
          <p>These are the paper's Figure 1 processes, re-drawn here from the same parameters. Top: the predicted probability across x with the moderator at its 5th (solid) and 95th (dashed) percentiles. Bottom: the coefficient as text only, on its dark strip, because it has no position on the probability axis; beneath it the AIE and the linear model's (LPM) interaction with 95% intervals, against the true effect (dashed line). Red marks an estimate whose interval misses the truth. The five are illustrations, not evidence about frequency: for that, the race runs 174 designs.</p>
          <div class="chips" id="gal-chips">${CASES.map((c, k) => `<button class="chip${k === 0 ? ' is-selected' : ''}" type="button" data-k="${k}">(${c.tag}) ${c.name}</button>`).join('')}</div>
          <div class="callout neutral" id="gal-note"></div>${back()}`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const layer = V.el('g', {}, svg);
          function draw(k) {
            const m = galleryCase(k);
            layer.innerHTML = '';
            const sx = V.scale(-2.5, 2.5, 60, 300), sy = V.scale(0, 1, 200, 40);
            V.text(layer, 60, 28, '(' + m.c.tag + ') ' + m.c.name, 'label-strong');
            V.axisX(layer, sx, 205, { ticks: [-2, -1, 0, 1, 2], fmt: (t) => tick(t), label: 'focal variable (SD units)' });
            V.axisY(layer, sy, 60, { ticks: [0, .5, 1], fmt: (t) => t === 0 ? '0' : t === 1 ? '1' : '.5', label: 'Pr(y = 1)', labelDx: 34 });
            V.el('path', { d: V.path(m.xs.map((x, i) => [sx(x), sy(m.lo[i])])), class: 'curve' }, layer);
            V.el('path', { d: V.path(m.xs.map((x, i) => [sx(x), sy(m.hi[i])])), class: 'curve dashed' }, layer);
            const ex = V.scale(-0.09, 0.19, 380, 610);
            V.text(layer, 330, 28, 'the three quantities', 'label-strong');
            V.axisX(layer, ex, 205, { ticks: [-0.05, 0, 0.05, 0.1, 0.15], fmt: (t) => tick(t, 2).replace('0.', '.'), label: 'interaction effect' });
            V.el('rect', { x: 326, y: 44, width: 288, height: 34, rx: 6, class: 'latent-box' }, layer);
            V.el('line', { x1: 330, x2: 610, y1: 44.5, y2: 44.5, class: 'seam-line' }, layer);
            V.text(layer, 336, 58, 'coefficient (latent scale)', 'latent-dim');
            V.text(layer, 336, 72, V.fmtSigned(m.fit.beta[3], 2) + ' (' + V.fmtP(m.pCoef) + ')', 'latent-text');
            V.el('line', { x1: ex(m.truth), x2: ex(m.truth), y1: 96, y2: 190, class: 'truth' }, layer);
            V.text(layer, ex(m.truth), 92, 'true effect', 'label-muted', { 'text-anchor': 'middle' });
            const rows = [{ y: 120, lab: 'AIE', e: m.aie.est, lo: m.aie.lo, hi: m.aie.hi, cls: 'aie' }, { y: 165, lab: 'LPM', e: m.lpm.est, lo: m.lpm.lo, hi: m.lpm.hi, cls: 'lpm' }];
            rows.forEach((r) => {
              const miss = r.lo > m.truth || r.hi < m.truth;
              V.text(layer, 372, r.y + 4, r.lab, 'label-muted', { 'text-anchor': 'end' });
              V.el('line', { x1: ex(r.lo), x2: ex(r.hi), y1: r.y, y2: r.y, class: 'ci', style: 'stroke:' + (miss ? 'var(--alarm)' : 'var(--c-' + r.cls + ')') }, layer);
              V.el('circle', { cx: ex(r.e), cy: r.y, r: 5, class: 'est', style: 'fill:' + (miss ? 'var(--alarm)' : 'var(--c-' + r.cls + ')') }, layer);
              if (miss) V.text(layer, ex(r.e), r.y + 20, 'misses the truth by ' + Math.round(100 * Math.abs(r.e - m.truth) / Math.abs(m.truth)) + '%', 'label-alarm', { 'text-anchor': 'middle' });
            });
            V.text(layer, 60, 262, 'true β₃ = ' + V.fmtSigned(m.b3, 3) + '. The AIE and the LPM are on the probability scale (cross-partial route).', 'label-muted');
            V.text(layer, 60, 282, 'Fresh draws of the paper\'s processes: the estimates differ slightly from Figure 1,', 'label-muted');
            V.text(layer, 60, 298, 'the population truths are the same.', 'label-muted');
            api.prose.querySelector('#gal-note').textContent = galleryNote(k, m);
          }
          api.prose.querySelectorAll('#gal-chips .chip').forEach((ch) => ch.addEventListener('click', () => { api.prose.querySelectorAll('#gal-chips .chip').forEach((o) => o.classList.toggle('is-selected', o === ch)); draw(+ch.getAttribute('data-k')); }));
          draw(0);
        }
      },
    ]
  });

  // ======================================================================
  // lpm — the straight line: the line through the curve, the bias map, and why
  // ======================================================================
  App.registerDeck({
    id: 'lpm', title: 'Where the straight line bends', short: 'The straight line', parent: 'race', parentIdx: 1,
    slides: [
      {
        title: 'The temptation', stage: true,
        prose: `
          <p class="kicker">Side room · The straight line</p>
          <h2>The straight line's honest temptation</h2>
          <p>Fit an ordinary regression to the yes/no outcome and the coefficient on x·z <em>is</em> the interaction effect in percentage points, with its standard error already in the table. If the world were linear, that would be the end of the story. Nearly half the 202 studies take this route, some saying outright that they did so to make the interaction interpretable.</p>
          <p>The world is curved. The stage shows the true probability of success across investment, and the straight line a linear model fits to it. <strong>Change the skewness of x.</strong> The firms move along the curve and the line tilts with them: a line through a curve is an approximation whose quality depends on where the firms happen to sit. The readout compares the true average interaction effect with the line's x·z coefficient for the same population.</p>
          <p class="small">The next stage maps how far the line lands from the truth across sixteen designs, and why even a perfect approximation targets a different quantity.</p>`,
        below: `<div class="controls"><div class="control"><label id="lin-sk-lbl">skewness of x</label><div class="toggle" id="lin-sk" role="group" aria-labelledby="lin-sk-lbl"><button type="button" data-v="0" class="is-on" aria-pressed="true">0</button><button type="button" data-v="2" aria-pressed="false">2</button><button type="button" data-v="4" aria-pressed="false">4</button></div></div><div class="readout"><div class="r"><span class="k">true average slope of x</span><span class="v blue" id="lin-true"></span></div><div class="r"><span class="k">the line's slope</span><span class="v" id="lin-line"></span></div><div class="r"><span class="k">true average interaction effect</span><span class="v blue" id="lin-ie"></span></div><div class="r"><span class="k">the line's x·z coefficient</span><span class="v" id="lin-xz"></span></div></div></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const sx = V.scale(-2.5, 4, 70, 600), sy = V.scale(0, 1, 300, 40);
          const g = V.el('g', {}, svg);
          V.axisX(g, sx, 330, { ticks: [-2, -1, 0, 1, 2, 3, 4], fmt: (t) => tick(t), label: 'investment x (standard deviations)' });
          V.axisY(g, sy, 70, { ticks: [0, .5, 1], fmt: (t) => t === 0 ? '0' : t === 1 ? '1' : '.5', label: 'Pr(success)', labelDx: 40 });
          const dens = V.el('g', {}, g), curve = V.el('path', { class: 'curve' }, g), line = V.el('path', { class: 'curve gray dashed' }, g);
          const tail = V.text(g, 598, 318, '', 'label-muted', { 'text-anchor': 'end' });
          V.text(g, 70, 30, 'True probability (black) and the linear model\'s line (gray, dashed)', 'label-strong');
          function draw(skew) {
            const spec = { intType: 'cxc', skewX: skew, skewZ: 0, link: 'probit', base: 0.3 };
            const pop = App.model('linpop' + skew, () => E.makePop(spec, 6000, 88));
            const beta = E.solveB0(pop, Object.assign(E.defaultBeta(), { bx: 0.9, bz: 0.4, b3: 0.15 }), L, 0.3);
            const xs = []; for (let x = -2.5; x <= 4.0001; x += 0.1) xs.push(+x.toFixed(2));
            const P = E.twoLine(pop, beta, L, 0, xs, 3);
            curve.setAttribute('d', V.path(xs.map((x, i) => [sx(x), sy(P[i])])));
            const Pv = new Float64Array(pop.N); for (let i = 0; i < pop.N; i++) Pv[i] = L.G(E.eta(pop, beta, i, pop.x[i], pop.z[i]));
            const o = E.ols(pop, Pv);
            const a = o.beta[0] + o.beta[5] * 0.3, b = o.beta[1]; // the line at z = 0, controls at their means
            const yMin = -0.03, yMax = 1.03;
            let xA = -2.5, xB = 4;
            if (b > 0) { xA = Math.max(xA, (yMin - a) / b); xB = Math.min(xB, (yMax - a) / b); }
            line.setAttribute('d', V.path([[sx(xA), sy(a + b * xA)], [sx(xB), sy(a + b * xB)]]));
            dens.innerHTML = '';
            const bins = new Array(26).fill(0); let beyond = 0;
            for (let i = 0; i < pop.N; i++) { const bb = Math.floor((pop.x[i] + 2.5) / 0.25); if (bb >= 0 && bb < 26) bins[bb]++; else if (pop.x[i] >= 4) beyond++; }
            const bmax = Math.max.apply(null, bins);
            bins.forEach((c, k) => V.el('rect', { x: sx(-2.5 + k * 0.25) + 1, y: 330 - 24 * c / bmax, width: (sx(0.25) - sx(0)) - 2, height: 24 * c / bmax, fill: 'var(--rule)' }, dens));
            tail.textContent = beyond ? Math.round(100 * beyond / pop.N) + '% of firms lie beyond +4' : '';
            let s = 0; for (let i = 0; i < pop.N; i++) s += (beta.bx + beta.b3 * pop.z[i]) * L.g(E.eta(pop, beta, i, pop.x[i], pop.z[i]));
            api.below.querySelector('#lin-true').textContent = V.fmtPP(s / pop.N) + ' per SD';
            api.below.querySelector('#lin-line').textContent = V.fmtPP(o.beta[1]) + ' per SD';
            api.below.querySelector('#lin-ie').textContent = V.fmtPP(E.aieDD(pop, beta, L), 2);
            api.below.querySelector('#lin-xz').textContent = V.fmtPP(o.beta[3], 2);
          }
          api.below.querySelectorAll('#lin-sk button').forEach((b) => b.addEventListener('click', () => { api.below.querySelectorAll('#lin-sk button').forEach((o) => { o.classList.toggle('is-on', o === b); o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); draw(+b.getAttribute('data-v')); }));
          draw(0);
        }
      },
      {
        title: 'The map', stage: true,
        prose: `
          <p class="kicker">Side room · The straight line</p>
          <h2>The linear model against two targets</h2>
          <p>Sixteen designs: four levels of skewness in x by four base rates, each with a real product-driven effect. The first map is exact: the population limit of the linear model's x·z coefficient against its own implicit target, the average <em>local</em> interaction (the cross-partial). The symmetric column is zero at every base rate, and the error grows with skewness to +115%.</p>
          <p>The second map is the same coefficient against the one-standard-deviation effect the hypotheses concern: largest exactly where the approximation is perfect, +150% at base rate .50. The two gaps can even cancel (skewness 4, base .02). The third map is the AIE against the same target: within 3% everywhere.</p>
          <p class="small">Toggle the maps; hover or focus a cell for the numbers. Sources: the paper's Appendix D.9 exact limits and its 5,000-replication bias map (Figure 4d).</p>`,
        below: `<div class="controls"><div class="toggle" id="lpm-t" role="group" aria-label="benchmark"><button type="button" data-v="cp" class="is-on" aria-pressed="true">linear vs its own target</button><button type="button" data-v="dd" aria-pressed="false">linear vs the one-SD effect</button><button type="button" data-v="aie" aria-pressed="false">AIE vs the one-SD effect</button></div></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const layer = V.el('g', {}, svg);
          const tip = V.tooltip(api.stage);
          const skews = [0, 1, 2, 4], bases = [0.5, 0.17, 0.06, 0.02];
          function cellValue(view, sk, b) {
            if (view === 'aie') { const r = D.biasmap.find((x) => +x.skew_x === sk && +x.base === b); return r ? 100 * (+r.aie_bias) / (+r.true_aie) : null; }
            const r = D.lpm_plim.find((x) => +x.skew_x === sk && +x.base === b); if (!r) return null;
            return view === 'cp' ? +r.vs_cp_pct : +r.vs_dd_pct;
          }
          function draw(view) {
            layer.innerHTML = '';
            const title = view === 'cp' ? 'Linear coefficient vs. its own target (average cross-partial), exact limits' : view === 'dd' ? 'Linear coefficient vs. the one-SD effect (the simulations\' target)' : 'ginteff AIE vs. the one-SD effect, 5,000 replications';
            V.text(layer, 40, 32, title, 'label-strong');
            V.text(layer, 40, 50, 'bias as a percentage of the true effect; blue: overstated, orange: understated', 'label-muted');
            const cw = 110, ch = 62, x0 = 120, y0 = 70;
            skews.forEach((sk, j) => V.text(layer, x0 + j * cw + cw / 2, y0 + 4 * ch + 20, 'skew ' + sk, 'label-muted', { 'text-anchor': 'middle' }));
            V.text(layer, x0 + 2 * cw, y0 + 4 * ch + 40, 'skewness of the focal variable', 'label-strong', { 'text-anchor': 'middle' });
            bases.forEach((b, i) => V.text(layer, x0 - 10, y0 + i * ch + ch / 2 + 4, 'base ' + b.toFixed(2).replace('0.', '.'), 'label-muted', { 'text-anchor': 'end' }));
            bases.forEach((b, i) => skews.forEach((sk, j) => {
              const v = cellValue(view, sk, b);
              const a = v == null ? 0 : Math.min(1, Math.abs(v) / 150);
              const rect = V.el('rect', { x: x0 + j * cw, y: y0 + i * ch, width: cw, height: ch, class: 'cell ' + (v >= 0 ? 'cell-pos' : 'cell-neg'), 'fill-opacity': (0.08 + 0.85 * a).toFixed(2), tabindex: '0', role: 'img', 'aria-label': 'skew ' + sk + ', base rate ' + b + ': ' + (v == null ? 'no value' : Math.round(v) + ' percent') }, layer);
              V.text(layer, x0 + j * cw + cw / 2, y0 + i * ch + ch / 2 + 5, v == null ? '—' : tick(Math.round(v)) + '%', 'cell-text', { style: a > 0.55 ? 'fill: var(--surface)' : '' });
              const showTip = (cx, cy) => { const r = D.lpm_plim.find((x) => +x.skew_x === sk && +x.base === b); tip.show(cx, cy, r ? `true one-SD effect ${V.fmtPP(+r.true_dd, 2)} · true cross-partial ${V.fmtPP(+r.true_cp, 2)} · linear limit ${V.fmtPP(+r.lpm_plim, 2)}` : ''); };
              rect.addEventListener('mousemove', (e) => showTip(e.clientX, e.clientY));
              rect.addEventListener('focus', () => { const rb = rect.getBoundingClientRect(); showTip(rb.left + rb.width / 2, rb.top + 8); });
              rect.addEventListener('mouseleave', tip.hide); rect.addEventListener('blur', tip.hide);
            }));
          }
          api.below.querySelectorAll('#lpm-t button').forEach((b) => b.addEventListener('click', () => { api.below.querySelectorAll('#lpm-t button').forEach((o) => { o.classList.toggle('is-on', o === b); o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); draw(b.getAttribute('data-v')); }));
          draw('cp');
        }
      },
      {
        title: 'Why', layout: 'prose',
        prose: `
          <p class="kicker">Side room · The straight line</p>
          <h2>Why a perfect approximation still answers the wrong question</h2>
          <p>With x and z independent and normal, a classical identity (Stein's) makes the linear coefficient's limit equal the average cross-partial exactly, controls or no controls. The linear model measures the <em>local</em> quantity essentially perfectly. But a hypothesis about a one-standard-deviation change asks for a finite step, and near the middle of the curve, where the base rate is one half, the local curvature is strong enough that the step averages away most of it: the local quantity is 2.5 times the finite one. Hence +150% at base .50, from a model that is doing exactly what it should.</p>
          <p>Skew the focal variable and the identity fails too, so the line misses both quantities. Neither gap follows a pattern simple enough to serve as a rule of thumb, and neither shrinks with the sample. The linear model does not dissolve the interaction problem so much as relocate it.</p>` + back()
      }
    ]
  });

  // ======================================================================
  // others — the other remedies
  // ======================================================================
  App.registerDeck({
    id: 'others', title: 'The other remedies', short: 'Other remedies', parent: 'aie', parentIdx: 0,
    slides: [
      {
        title: 'A menu of partial solutions', layout: 'prose',
        prose: `
          <p class="kicker">Side room · The other remedies</p>
          <h2>A menu of partial solutions</h2>
          <p>Among the eleven census articles with a genuine probability-scale test the paper finds at least four distinct tools, no two interchangeable. None is general; their coexistence is itself the symptom.</p>
          <table class="tbl"><thead><tr><th>approach</th><th>what it does</th><th>where it stops</th></tr></thead><tbody>
            <tr><td>Wiersema &amp; Bowen (2009)</td><td>plot the true interaction effect across the moderator</td><td>a display without a test; binary outcomes</td></tr>
            <tr><td><code>inteff</code> (Norton et al., 2004); <code>inteff3</code></td><td>second differences with a standard error</td><td>binary logit and probit only; three-way only for binary variables</td></tr>
            <tr><td>Mize (2019) second differences</td><td>the contrast built through Stata's <code>margins</code></td><td>worked coverage is binary; assembled by hand each time</td></tr>
            <tr><td>Zelner (2009) simulation</td><td>simulate the cross-difference and its interval</td><td>the one existing practice that holds near-nominal size (6% to 9% in the paper's 27-design arm), but it tests at one covariate point, usually the means, drifts upward with the sample, and is rebuilt per application</td></tr>
            <tr><td>Jeong et al. (2020) recentering</td><td>read the effect at a point off a single coefficient</td><td>stays on the log-odds scale; the moderation verdict is the ordinary coefficient test</td></tr>
          </tbody></table>
          <p>None engages instrumented estimation, and two of the paper's three reanalyses require it. The next stage shows the recentering point exactly.</p>`
      },
      {
        title: 'Recentering', stage: true,
        prose: `
          <p class="kicker">Side room · The other remedies</p>
          <h2>Recentering moves the wrong coefficient</h2>
          <p>Recentering re-estimates the model with the interacted variables centred at a point of interest and reads the effect of x at that point off the lower-order coefficient. That part works, and the stage shows it for z: <strong>slide the centring point</strong> and the coefficient on x moves, with its own standard error.</p>
          <p>The moderation verdict, however, comes from the product-term coefficient, which is algebraically invariant to recentering: expanding (x − c)(z − d) leaves β<sub>3</sub> as the xz coefficient. Its estimate, its standard error and its p-value do not move, to machine precision. Whatever the coefficient gets wrong, the recentered coefficient gets wrong identically: the paper checks this in 500 replications under each null.</p>` + back(),
        below: `<div class="controls"><div class="control" style="min-width:220px"><label for="rc-d">centre z at d</label><input id="rc-d" type="range" min="-2" max="2" step="0.1" value="0"><span class="val" id="rc-dv"></span></div></div><div class="index-panel" id="rc-panel"></div>`,
        mount: function (api) {
          const s = S.mechSample();
          const svg = V.svg(api.stage, W, H);
          const f = s.fit, Vc = f.vcov;
          const sx = V.scale(-0.6, 1.6, 90, 600);
          V.el('rect', { x: 40, y: 56, width: 584, height: 300, rx: 10, class: 'latent-box' }, svg);
          V.el('line', { x1: 44, x2: 620, y1: 56.5, y2: 56.5, class: 'seam-line' }, svg);
          const g = V.el('g', {}, svg);
          V.text(g, 56, 36, 'Fitted probit, n = 7,500: two coefficients as z is recentred (the index, in the dark)', 'label-strong');
          const ax = V.axisX(g, sx, 330, { ticks: [-0.5, 0, 0.5, 1, 1.5], fmt: (t) => tick(t, 1), label: 'coefficient (latent scale), 95% interval' });
          ax.querySelectorAll('text').forEach((t) => t.setAttribute('class', 'latent-dim'));
          ax.querySelectorAll('line').forEach((l) => l.setAttribute('stroke', '#6b7690'));
          V.el('line', { x1: sx(0), x2: sx(0), y1: 70, y2: 330, stroke: '#6b7690', 'stroke-dasharray': '3 4' }, g);
          const rows = [{ y: 130, lab: 'coefficient on x (moves with d)' }, { y: 230, lab: 'coefficient on x·z: β₃ (does not move)' }];
          rows.forEach((r) => { V.text(g, 90, r.y - 22, r.lab, 'latent-text'); r.ci = V.el('line', { class: 'ci', y1: r.y, y2: r.y, style: 'stroke: var(--amber)' }, g); r.est = V.el('circle', { class: 'est', r: 6, cy: r.y, style: 'fill: var(--amber); stroke: var(--latent)' }, g); r.t = V.text(g, 90, r.y + 26, '', 'latent-dim'); });
          const din = api.below.querySelector('#rc-d');
          function draw() {
            const d = parseFloat(din.value);
            api.below.querySelector('#rc-dv').textContent = 'd = ' + tick(d, 1) + ' SD';
            const b1 = f.beta[1] + f.beta[3] * d, v1 = Vc[1][1] + d * d * Vc[3][3] + 2 * d * Vc[1][3], se1 = Math.sqrt(v1);
            const b3 = f.beta[3], se3 = f.se[3];
            [[b1, se1], [b3, se3]].forEach((q, k) => {
              const r = rows[k];
              r.ci.setAttribute('x1', sx(q[0] - 1.96 * q[1])); r.ci.setAttribute('x2', sx(q[0] + 1.96 * q[1])); r.est.setAttribute('cx', sx(q[0]));
              r.t.textContent = V.fmtSigned(q[0], 4) + ' (SE ' + q[1].toFixed(4) + ', ' + V.fmtP(E.pValue(q[0] / q[1])) + ')';
            });
            api.below.querySelector('#rc-panel').innerHTML = `<span class="lbl">the recentred model</span>index = β<sub>0</sub>′ + <span class="val">${V.fmtSigned(b1, 3)}</span>·x + β<sub>2</sub>′·(z − ${d.toFixed(1)}) + <span class="b3">${V.fmtSigned(b3, 4)}</span>·x·(z − ${d.toFixed(1)}) + controls <span class="badge">β<sub>3</sub> p-value: ${V.fmtP(s.pCoef)} at every d</span>`;
          }
          din.addEventListener('input', draw); draw();
        }
      },
    ]
  });

  // ======================================================================
  // families — beyond yes/no
  // ======================================================================
  App.registerDeck({
    id: 'families', title: 'Beyond yes/no', short: 'Beyond yes/no', parent: 'aie', parentIdx: 0,
    slides: [
      {
        title: 'Ordered outcomes', stage: true,
        prose: `
          <p class="kicker">Side room · Beyond yes/no</p>
          <h2>Ordered outcomes: one effect per category, summing to zero</h2>
          <p>When the outcome is a rating from 1 to 5 rather than a yes or a no, an ordered logit puts cutpoints on the latent index; the probability of each category is the slice of the curve between two cutpoints. <strong>Drag the firm along the index.</strong> A push that raises the top category must lower others, so every effect built from pushes, the interaction included, is a vector over categories that sums to zero, and <code>ginteff</code> reports it category by category. That is how the paper's ordinal reanalysis found polarisation where a single coefficient saw only "more agreement".</p>
          <p class="small">Cutpoints here are set so the population shares are .35/.25/.20/.12/.08, the paper's ordered simulation arm; the arm's probability null and power target are defined on the top category.</p>` + back(),
        below: `<div class="index-panel attached"><div class="controls"><div class="control" style="flex:1;min-width:220px"><label for="fam-eta">position on the index (or drag)</label><input id="fam-eta" class="latent" type="range" min="-5" max="4" step="0.1" value="-0.5"></div></div></div><div class="readout" id="fam-ro"></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const sx = V.scale(-5, 5, 70, 570), sy = V.scale(0, 1, 300, 50);
          const g = V.el('g', {}, svg);
          const shares = [.35, .25, .20, .12, .08], cum = []; let acc = 0; shares.forEach((s) => { acc += s; cum.push(acc); });
          const cuts = cum.slice(0, 4).map((c) => Math.log(c / (1 - c)));
          const Pc = (e) => { const F = (k) => 1 / (1 + Math.exp(-(k - e))); const out = []; for (let c = 0; c < 5; c++) out.push((c === 4 ? 1 : F(cuts[c])) - (c === 0 ? 0 : F(cuts[c - 1]))); return out; };
          const cols = ['var(--neg)', 'var(--gold)', 'var(--gray)', '#8FB8DC', 'var(--blue)'];
          const es = []; for (let e = -5; e <= 5.001; e += 0.1) es.push(+e.toFixed(2));
          const P = es.map(Pc);
          for (let c = 0; c < 5; c++) {
            const top = es.map((e, i) => { let s = 0; for (let k = 0; k <= c; k++) s += P[i][k]; return [sx(e), sy(s)]; });
            const bot = es.map((e, i) => { let s = 0; for (let k = 0; k < c; k++) s += P[i][k]; return [sx(e), sy(s)]; }).reverse();
            V.el('path', { d: V.path(top) + V.path(bot).replace('M', 'L') + 'Z', fill: cols[c], opacity: .55 }, g);
          }
          // direct band labels at the right edge (η = 5)
          const P0 = Pc(0); let run = 0;
          P0.forEach((p, c) => { const mid = run + p / 2; run += p; V.text(g, sx(0), sy(mid) + 4, 'category ' + (c + 1), 'label-strong halo', { 'text-anchor': 'middle' }); });
          V.axisX(g, sx, 330, { ticks: [-4, -2, 0, 2, 4], fmt: (t) => tick(t), label: 'the latent index' });
          V.axisY(g, sy, 70, { ticks: [0, .5, 1], fmt: (t) => t === 0 ? '0' : t === 1 ? '1' : '.5', label: 'cumulative probability', labelDx: 44 });
          cuts.forEach((k, i) => { V.el('line', { x1: sx(k), x2: sx(k), y1: 300, y2: 314, stroke: 'var(--ink-2)' }, g); V.text(g, sx(k), 296, 'k' + (i + 1), 'label-muted', { 'text-anchor': 'middle' }); });
          V.text(g, 74, 40, 'Category probabilities across the index (1 = bottom, orange; 5 = top, blue)', 'label-strong');
          const vl = V.el('line', { class: 'window-edge', y1: 50, y2: 300 }, g);
          const vl2 = V.el('line', { class: 'window-edge', y1: 50, y2: 300, 'stroke-dasharray': '1 3' }, g);
          const hit = V.el('rect', { x: 0, y: 0, width: W, height: H, class: 'hit drag' }, svg);
          const etaIn = api.below.querySelector('#fam-eta');
          let e0 = -0.5;
          function draw() {
            vl.setAttribute('x1', sx(e0)); vl.setAttribute('x2', sx(e0)); vl2.setAttribute('x1', sx(e0 + 1)); vl2.setAttribute('x2', sx(e0 + 1));
            const a = Pc(e0), b = Pc(e0 + 1);
            api.below.querySelector('#fam-ro').innerHTML = '<div class="r"><span class="k">a push of +1 from index ' + e0.toFixed(1) + '</span><span class="v">changes each category by</span></div>' + a.map((p, c) => `<div class="r"><span class="k"><span class="sw" style="background:${cols[c]}"></span>cat ${c + 1}</span><span class="v">${V.fmtPP(b[c] - p)}</span></div>`).join('') + '<div class="r"><span class="k">sum</span><span class="v">' + V.fmtPP(b.reduce((s, v, c) => s + v - a[c], 0)) + '</span></div>';
            etaIn.value = e0.toFixed(1);
          }
          api.onCleanup(V.drag(svg, hit, (p) => { e0 = V.clamp(sx.inv(p.x), -5, 4); draw(); }));
          etaIn.addEventListener('input', () => { e0 = parseFloat(etaIn.value); draw(); });
          draw();
        }
      },
      {
        title: 'Multinomial, fractional, three-way', layout: 'prose',
        prose: `
          <p class="kicker">Side room · Beyond yes/no</p>
          <h2>Multinomial, fractional, and three-way</h2>
          <p><strong>Multinomial</strong> outcomes have one index per alternative, and each alternative's probability depends on all of them, so the two-term decomposition of the binary case does not carry over: curvature terms accumulate from every index. The estimand does carry over unchanged: a double difference of a predicted probability, alternative by alternative.</p>
          <p><strong>Fractional</strong> outcomes, shares between 0 and 1 fitted by quasi-likelihood, obey the same decomposition with the same G; the paper's fractional arm is where the product-term coefficient is at its worst, with 94% to 100% false positives under a true zero.</p>
          <p><strong>Three-way</strong> interactions take the triple cross-partial or the triple difference of the same predicted outcome. All of these run through the finite-change route.</p>
          <table class="tbl"><thead><tr><th>family</th><th>Stata fit</th><th>R fit</th><th>routes</th></tr></thead><tbody>
            <tr><td>binary</td><td><code>logit</code>, <code>probit</code>; control function via <code>cfprobit</code></td><td><code>glm</code> (binomial)</td><td>cross-partial, finite change</td></tr>
            <tr><td>fractional</td><td><code>fracreg</code>; <code>cmp</code> for joint QMLE</td><td><code>glm</code> (quasibinomial)</td><td>finite change</td></tr>
            <tr><td>ordered</td><td><code>ologit</code>, <code>oprobit</code></td><td><code>MASS::polr</code></td><td>per category</td></tr>
            <tr><td>multinomial</td><td><code>mlogit</code></td><td><code>nnet::multinom</code></td><td>per alternative</td></tr>
          </tbody></table>
          <p class="small">Count and duration models are not covered; for interaction effects in count models see McCabe et al. (2022).</p>` + back('Back to the average')
      }
    ]
  });

  // ======================================================================
  // panel — panels and fixed effects
  // ======================================================================
  App.registerDeck({
    id: 'panel', title: 'Panels and fixed effects', short: 'Panels & FE', parent: 'now', parentIdx: 0,
    slides: [
      {
        title: 'The panel arm', stage: true,
        prose: `
          <p class="kicker">Side room · Panels and fixed effects</p>
          <h2>Where the nonlinear route has real boundaries</h2>
          <p>41% of the qualifying articles estimate unit fixed effects. Conditional (fixed-effects) logit sweeps the unit effects out of the likelihood and with them any predicted probability, so no probability-scale interaction effect exists there; dummy fixed effects in a probit raise the incidental-parameters problem, a bias that does not vanish with more units. The field's usual answer is the within-transformed linear model (each variable minus its unit mean) with its product coefficient read as the effect.</p>
          <p>The paper's panel arm draws five periods per unit with heterogeneity correlated with the interacted variables' unit means, and races a correlated-random-effects (Mundlak) probit, a pooled probit and the fixed-effects linear model on identical samples. The stage shows their false-positive rates under a true zero and their coverage under a real effect.</p>` + back(),
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const g = V.el('g', {}, svg);
          const rows = D.panel;
          const get = (regime, units) => rows.find((r) => r.regime === regime && +r.n_units === units);
          function block(y0, title, items, refLabel) {
            const sx = V.scale(0, 1, 250, 600);
            V.text(g, 24, y0 - 10, title, 'label-strong');
            V.axisX(g, sx, y0 + items.length * 21 + 2, { ticks: [0, .25, .5, .75, 1], fmt: (t) => Math.round(100 * t) + '%' });
            V.el('line', { x1: sx(items[0].ref), x2: sx(items[0].ref), y1: y0 - 2, y2: y0 + items.length * 21 + 2, class: 'nominal' }, g);
            V.text(g, sx(items[0].ref) + 4, y0 + items.length * 21 + 14, refLabel, 'label-muted', { 'text-anchor': items[0].ref > 0.5 ? 'end' : 'start' });
            items.forEach((it, k) => {
              const y = y0 + k * 21 + 3;
              V.text(g, 242, y + 11, it.lab, 'label-muted', { 'text-anchor': 'end' });
              V.el('rect', { x: sx(0), y: y, width: sx(it.v) - sx(0), height: 14, rx: 3, fill: it.col }, g);
              V.text(g, sx(it.v) + 5, y + 11, Math.round(100 * it.v) + '%', 'label-strong');
            });
          }
          const fp = [];
          [300, 1500].forEach((u) => { const r = get('prob_null', u); fp.push({ lab: 'CRE (Mundlak) probit, ' + u + '×5', v: +r.rej_cre_aie, col: 'var(--c-aie)', ref: .05 }); });
          [300, 1500].forEach((u) => { const r = get('prob_null', u); fp.push({ lab: 'pooled probit, ' + u + '×5', v: +r.rej_pool_aie, col: 'var(--c-coef)', ref: .05 }); });
          [300, 1500].forEach((u) => { const r = get('prob_null', u); fp.push({ lab: 'FE linear model, ' + u + '×5', v: +r.rej_lpmfe, col: 'var(--c-lpm)', ref: .05 }); });
          block(44, 'False-positive rate when the true average effect is zero (share of 1,000 samples)', fp, 'nominal 5%');
          const cov = [];
          [300, 1500].forEach((u) => { const r = get('power', u); cov.push({ lab: 'CRE (Mundlak) probit, ' + u + '×5', v: +r.cre_cover, col: 'var(--c-aie)', ref: .95 }); });
          [300, 1500].forEach((u) => { const r = get('power', u); cov.push({ lab: 'pooled probit, ' + u + '×5', v: +r.pool_cover, col: 'var(--c-coef)', ref: .95 }); });
          [300, 1500].forEach((u) => { const r = get('power', u); cov.push({ lab: 'FE linear model, ' + u + '×5', v: +r.lpmfe_cover, col: 'var(--c-lpm)', ref: .95 }); });
          block(246, 'Coverage of the true effect by nominal 95% intervals (share of samples)', cov, 'nominal 95%');
        }
      },
      {
        title: 'What to do', layout: 'prose',
        prose: `
          <p class="kicker">Side room · Panels and fixed effects</p>
          <h2>What to do with a panel</h2>
          <p>The correlated-random-effects specification adds the unit means of the interacted variables as regressors (Wooldridge, 2010, section 15.8). It restores identified probabilities, recovers the average interaction effect essentially without bias, holds its false-positive rate at 6% to 7%, and covers the true effect in 92% to 95% of replications, on the same samples where the pooled probit's coverage falls to 6% and the fixed-effects linear model's false-positive rate climbs from 36% to 92%.</p>
          <p>For nonlinear difference-in-differences designs, see Wooldridge (2023). Where high-dimensional fixed effects force a linear model, report it as an approximation, not a rescue: in the linear case too, a fixed-effects product term confounds within and between variation (Shaver, 2019).</p>` + back()
      }
    ]
  });
})();
