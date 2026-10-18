/* decks.js — the short path, steps 1–7 (start, curve, coef, plot, aie) and the side room `window`.
   Every playable runs the paper's own process (Figure 2: probit, continuous x and z,
   base rate .17, main effects .8, b3 solved so the average interaction effect is zero). */
(function () {
  'use strict';
  const E = Engine, L = E.probit, V = App.V;
  const W = 640, H = 400;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const B0 = -1.4; // intercept of the curve deck's toy model: about 17 firms in 100 succeed

  // ---------- shared models ----------
  function mech() {
    return App.model('mech', () => {
      const spec = { intType: 'cxc', skewX: 0, skewZ: 0, link: 'probit', base: 0.17 };
      const pop = E.makePop(spec, 10000, 88);
      const base = E.defaultBeta(); base.bx = 0.8; base.bz = 0.8;
      const bNull = E.solveB3(pop, base, L, 0.17, 0);
      const bZero = E.solveB0(pop, Object.assign({}, base, { b3: 0 }), L, 0.17);
      return { spec: spec, pop: pop, base: base, bNull: bNull, bZero: bZero };
    });
  }
  function mechSample() {
    return App.model('mechSample', () => {
      const m = mech();
      const d = E.drawSample(m.spec, 7500, m.bNull, L, 20260708);
      const fit = E.fitBinary(d, L);
      const aie = E.aieDelta(d, fit, L);
      const ieFit = ieFromFit(d, fit);
      return { d: d, fit: fit, aie: aie, ie: ieFit, pCoef: E.pValue(fit.beta[3] / fit.se[3]) };
    });
  }
  function ieFromFit(d, fit) {
    const b = { b0: fit.beta[0], bx: fit.beta[1], bz: fit.beta[2], b3: fit.beta[3], gw1: fit.beta[4], gw2: fit.beta[5] };
    return E.ieVector(d, b, L);
  }
  function mechAme() {
    return App.model('mechAme', () => {
      const s = mechSample();
      const zs = []; for (let z = -2; z <= 2.0001; z += 0.1) zs.push(+z.toFixed(2));
      return E.ameCurve(s.d, s.fit, L, zs);
    });
  }

  // ---------- drawing helpers ----------
  function curveStage(svg, o) {
    o = o || {};
    const x0 = o.x0 == null ? -4 : o.x0, x1 = o.x1 == null ? 4 : o.x1;
    const sx = V.scale(x0, x1, 64, 610), sy = V.scale(0, 1, 300, 40);
    const g = V.el('g', {}, svg);
    const grid = V.el('g', { class: 'grid' }, g);
    [0.25, 0.5, 0.75].forEach((p) => V.el('line', { x1: sx.r0, x2: sx.r1, y1: sy(p), y2: sy(p) }, grid));
    V.axisY(g, sy, 64, { ticks: [0, .25, .5, .75, 1], fmt: (t) => t === 0 ? '0' : t === 1 ? '1' : t.toFixed(2).replace(/^0/, ''), label: 'Pr(success)', labelDx: 44 });
    V.el('rect', { x: 0, y: 322, width: W, height: H - 322, class: 'latent-box' }, g);
    V.el('rect', { x: 0, y: 322, width: W, height: 16, class: 'seam' }, g);
    V.el('line', { x1: 0, x2: W, y1: 322.5, y2: 322.5, class: 'seam-line' }, g);
    const ticks = []; for (let t = Math.ceil(x0); t <= x1; t++) ticks.push(t);
    ticks.forEach((t) => { V.el('line', { x1: sx(t), x2: sx(t), y1: 322, y2: 330, stroke: 'var(--amber-dim)', 'stroke-width': 1 }, g); V.text(g, sx(t), 346, (t > 0 ? '+' : '') + t, 'latent-dim', { 'text-anchor': 'middle' }); });
    V.text(g, 64, 388, o.stripLabel || 'the index (latent scale): where the coefficients live', 'latent-dim');
    const pts = [];
    for (let e = x0; e <= x1 + 1e-9; e += (x1 - x0) / 160) pts.push([sx(e), sy(L.G(e))]);
    const curvePath = V.el('path', { d: V.path(pts), class: 'curve' }, g);
    drawIn(curvePath);
    return { g: g, sx: sx, sy: sy };
  }
  function bracket(g, x, yA, yB, label, side, cls) {
    const gg = V.el('g', {}, g);
    const dir = side === 'left' ? -1 : 1;
    V.el('path', { d: 'M' + x + ' ' + yA + ' h' + (8 * dir) + ' V' + yB + ' h' + (-8 * dir), class: 'bracket' }, gg);
    V.text(gg, x + 13 * dir, (yA + yB) / 2 + 4.5, label, 'bracket-text ' + (cls || ''), { 'text-anchor': side === 'left' ? 'end' : 'start' });
    return gg;
  }
  function fmtPts(v) { return (v >= 0 ? '+' : '−') + Math.abs(100 * v).toFixed(Math.abs(v) < 0.0095 ? 1 : 0) + ' pp'; }

  function swarm(svg, o) {
    o = o || {};
    const sx = V.scale(o.min == null ? -0.12 : o.min, o.max == null ? 0.12 : o.max, 70, 610);
    const yMid = o.y == null ? 250 : o.y, spread = o.spread == null ? 60 : o.spread;
    const g = V.el('g', {}, svg);
    const grid = V.el('g', { class: 'grid' }, g);
    const ticks = o.ticks || [-0.1, -0.05, 0, 0.05, 0.1];
    ticks.forEach((t) => V.el('line', { x1: sx(t), x2: sx(t), y1: yMid - spread - 10, y2: yMid + spread + 10 }, grid));
    V.axisX(g, sx, yMid + spread + 14, { ticks: ticks, fmt: (t) => (t > 0 ? '+' : '') + Math.round(100 * t), label: o.label || 'interaction effect for one firm (percentage points)' });
    V.el('line', { x1: sx(0), x2: sx(0), y1: yMid - spread - 14, y2: yMid + spread + 14, class: 'zero' }, g);
    const sw = V.el('g', { class: 'swarm' }, g);
    const rng = E.mulberry32(7);
    const n = o.n || 1500, dots = [], jit = [];
    for (let i = 0; i < n; i++) { jit.push((rng() * 2 - 1) * spread); dots.push(V.el('circle', { r: 2.2, cx: sx(0), cy: yMid + jit[i] }, sw)); }
    const mk = V.el('g', {}, g);
    const my = o.markerY || (yMid - spread - 34);
    const ci = V.el('line', { class: 'ci', x1: sx(0), x2: sx(0), y1: my, y2: my, opacity: 0 }, mk);
    const est = V.el('circle', { class: 'est', r: 7, cx: sx(0), cy: my }, mk);
    const lab = V.text(mk, sx(0), my - 14, '', 'label-blue', { 'text-anchor': 'middle' });
    const clampT = V.text(g, sx.r1, yMid + spread + 8, '', 'label-muted', { 'text-anchor': 'end' });
    function update(values, stride, aie, ciLoHi, labelText) {
      stride = stride || 1;
      let k = 0, beyond = 0;
      for (let i = 0; i < values.length && k < n; i += stride, k++) {
        const v = values[i], c = dots[k];
        if (v < sx.d0 || v > sx.d1) beyond++;
        c.setAttribute('cx', sx(V.clamp(v, sx.d0, sx.d1)).toFixed(1));
        c.setAttribute('class', v > 0 ? 'pos' : (v < 0 ? 'neg' : ''));
      }
      clampT.textContent = beyond ? beyond + ' of ' + k + ' dots beyond the axis' : '';
      if (aie != null) {
        est.setAttribute('cx', sx(V.clamp(aie, sx.d0, sx.d1)));
        lab.setAttribute('x', V.clamp(sx(aie), sx.r0 + 90, sx.r1 - 90));
        lab.textContent = labelText || '';
        if (ciLoHi) { ci.setAttribute('x1', sx(ciLoHi[0])); ci.setAttribute('x2', sx(ciLoHi[1])); ci.setAttribute('opacity', 1); }
      }
    }
    return { g: g, sx: sx, update: update, dots: dots, jit: jit, yMid: yMid, est: est, ci: ci, lab: lab, sw: sw };
  }
  // bet chips: rightId may be null when every answer is admissible (the reveal judges later)
  function betChips(api, containerId, rightId, onPick, storeKey) {
    const chips = api.prose.querySelectorAll('#' + containerId + ' .chip');
    const settle = (bet) => chips.forEach((o) => {
      o.disabled = true; o.classList.toggle('is-selected', o.getAttribute('data-bet') === bet);
      if (rightId != null) { o.classList.toggle('is-right', o.getAttribute('data-bet') === rightId); if (o.getAttribute('data-bet') === bet && bet !== rightId) o.classList.add('is-wrong'); }
    });
    chips.forEach((ch) => ch.addEventListener('click', () => { const bet = ch.getAttribute('data-bet'); settle(bet); api.set(storeKey, bet); onPick(bet, true); }));
    const prior = api.get(storeKey);
    if (prior) { settle(prior); onPick(prior, false); }
  }
  function drawIn(path, ms) {
    if (reduced || !path.getTotalLength) return;
    let len; try { len = path.getTotalLength(); } catch (e) { return; }
    path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset ' + (ms || 650) + 'ms cubic-bezier(.2,.7,.2,1)';
    path.style.strokeDashoffset = 0;
    path.addEventListener('transitionend', () => { path.style.strokeDasharray = ''; path.style.transition = ''; }, { once: true });
  }
  function fanOut(sw, animate) {
    sw.sw.setAttribute('opacity', 1);
    const show = () => { sw.est.setAttribute('opacity', 1); sw.lab.setAttribute('opacity', 1); };
    if (!animate || reduced) { show(); return; }
    const to = sw.dots.map((d) => parseFloat(d.getAttribute('cx'))), x0 = sw.sx(0), t0 = performance.now(), dur = 720;
    sw.est.setAttribute('opacity', 0); sw.lab.setAttribute('opacity', 0);
    (function step(now) {
      const t = Math.max(0, Math.min(1, (performance.now() - t0) / dur)), e = 1 - Math.pow(1 - t, 3);
      sw.dots.forEach((d, k) => d.setAttribute('cx', (x0 + (to[k] - x0) * e).toFixed(1)));
      if (t < 1) requestAnimationFrame(step); else show();
    })(t0);
  }
  // the hero: the curve rises out of a dark pool; a window drifts along it (start) or the whole curve is lit (end)
  function heroCurve(api, o) {
    o = o || {};
    const d = 'M -20 640 C 420 640, 480 60, 900 60 L 1240 60';
    const bg = V.el('svg', { class: 'hero-curve' + (o.end ? ' is-end' : ''), viewBox: '0 0 1200 700', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
    V.el('rect', { class: 'pool', x: 0, y: 0, width: 1200, height: 700 }, bg);
    const dim = V.el('path', { class: 'dim', d: d }, bg);
    if (!o.end) {
      const cp = V.el('clipPath', { id: 'heroWin' }, bg);
      const win = V.el('rect', { x: 60, y: 0, width: 230, height: 700 }, cp);
      const g = V.el('g', { 'clip-path': 'url(#heroWin)' }, bg);
      const pane = V.el('rect', { class: 'pane', x: 60, y: 0, width: 230, height: 700 }, g);
      V.el('path', { class: 'lit', d: d }, g);
      if (!reduced) [win, pane].forEach((r) => V.el('animate', { attributeName: 'x', values: '60;900;60', keyTimes: '0;.5;1', dur: '26s', begin: '2.2s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: '.45 0 .55 1;.45 0 .55 1' }, r));
      V.el('circle', { class: 'ghost', cx: 232, cy: 628, r: 8 }, bg);
      V.el('circle', { class: 'firm', cx: 122, cy: 636, r: 9 }, bg);
    } else {
      const endG = V.el('g', { transform: 'translate(0 48)' }, bg); endG.appendChild(dim);
      V.el('path', { class: 'lit full', d: d }, endG);
      V.el('circle', { class: 'ghost', cx: 890, cy: 62, r: 8 }, endG);
      V.el('circle', { class: 'firm', cx: 1000, cy: 60, r: 9 }, endG);
    }
    api.root.appendChild(bg);
    if (!reduced) { const len = 2200; dim.style.strokeDasharray = len; dim.style.strokeDashoffset = len; dim.style.transition = 'stroke-dashoffset 2.4s ease-out'; requestAnimationFrame(() => requestAnimationFrame(() => { dim.style.strokeDashoffset = 0; })); }
  }
  // ---------- show, then play ----------
  // A reader who only presses Next should still see the point of a stage, so some stages perform
  // their key move once. Any real touch cancels the performance and hands over control; under
  // reduced motion the stage jumps to the end state instead; on a revisit nothing moves by itself.
  function handover(api) {
    let live = true; const fns = [];
    const onUser = (e) => { if (e.isTrusted) stop(); };
    function stop() { if (!live) return; live = false; fns.forEach((f) => f()); api.root.removeEventListener('pointerdown', onUser, true); api.root.removeEventListener('keydown', onUser, true); }
    api.root.addEventListener('pointerdown', onUser, true); api.root.addEventListener('keydown', onUser, true);
    api.onCleanup(stop);
    return { live: () => live, onStop: (f) => fns.push(f), stop: stop };
  }
  function glide(api, input, waypoints, o) {
    o = o || {};
    const set = (v) => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); };
    if (reduced) { set(waypoints[waypoints.length - 1]); if (o.done) o.done(); return; }
    const h = handover(api); let raf = 0, timer = 0, from = parseFloat(input.value), k = 0;
    h.onStop(() => { cancelAnimationFrame(raf); clearTimeout(timer); });
    const leg = () => {
      if (!h.live()) return;
      if (k >= waypoints.length) { h.stop(); if (o.done) o.done(); return; }
      const to = waypoints[k], t0 = performance.now(), dur = o.ms || 1200;
      const step = (now) => {
        if (!h.live()) return;
        const t = Math.max(0, Math.min(1, (performance.now() - t0) / dur)), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        set(from + (to - from) * e);
        if (t < 1) raf = requestAnimationFrame(step); else { from = to; k++; timer = setTimeout(leg, o.pause == null ? 260 : o.pause); }
      };
      raf = requestAnimationFrame(step);
    };
    timer = setTimeout(leg, o.delay == null ? 700 : o.delay);
  }
  function sequence(api, steps, o) {
    o = o || {};
    if (reduced) return;
    const h = handover(api); let timer = 0, k = 0;
    h.onStop(() => clearTimeout(timer));
    const run = () => { if (!h.live()) return; if (k >= steps.length) { h.stop(); return; } steps[k++](); timer = setTimeout(run, o.gap || 1400); };
    timer = setTimeout(run, o.delay == null ? 1600 : o.delay);
  }
  App.shared = { mech: mech, mechSample: mechSample, mechAme: mechAme, curveStage: curveStage, swarm: swarm, bracket: bracket, fmtPts: fmtPts, betChips: betChips, drawIn: drawIn, fanOut: fanOut, heroCurve: heroCurve, glide: glide, sequence: sequence, reduced: reduced };

  // ======================================================================
  // 1 — start
  // ======================================================================
  App.registerDeck({
    id: 'start', title: 'One in eighteen', short: 'One in eighteen',
    slides: [
      {
        title: 'The hook', layout: 'hero',
        prose: `
          <p class="kicker">An explorable explanation · built on the ginteff paper</p>
          <h1>Does experience make an investment pay off more?</h1>
          <p>A firm invests in a new market, and it succeeds or it fails. The theory says investment pays off more for experienced firms. Written as a hypothesis: <em>the effect of investment on the probability of success depends on experience.</em> Nearly every contingency claim in management has this shape, and the outcome is often a yes or a no, a share, or a ranked choice: the firm succeeds, enters, adopts; the candidate is hired.</p>
          <div class="bignum-row">
            <div><div class="bignum">202</div><div class="bignum-cap">studies in five top journals tested a claim like this on such an outcome, 2023–2025</div></div>
            <div><div class="bignum">11</div><div class="bignum-cap">tested it with a quantity that can actually answer it</div></div>
          </div>
          <p>The rest read the answer off a regression coefficient, a plot, or a linear model. Could they be wrong? Badly. To see how, we do not need their data. We need one curve.</p>
          <div class="cta"><button class="btn btn-primary btn-lg" type="button" data-go="curve/0">Show me the curve →</button><span class="small muted">about 9 minutes · 12 short steps</span></div>`,
        mount: function (api) { heroCurve(api); setTimeout(function () { try { mech(); } catch (e) { console.error(e); } }, 900); }
      }
    ]
  });

  // ======================================================================
  // 2–3 — curve
  // ======================================================================
  App.registerDeck({
    id: 'curve', title: 'Standing on the curve', short: 'The curve',
    slides: [
      {
        title: 'The same push, a different response', stage: true,
        prose: (c) => `
          <p class="kicker">The curve</p>
          <h2>The same push, a different response</h2>
          <p>A yes/no outcome is modelled with a curve like this one. Every firm has an <em>index</em>, a score that adds up its characteristics, and the curve turns the index into a probability of success. The index is the dark strip (statisticians call it the latent scale); that is where regression coefficients live. Logit or probit, the curve has this shape.</p>
          <p>The solid dot is a firm. The hollow dot is the same firm after a push of +1 on its index, from more investment, say. The bracket is what that push is worth, in percentage points of probability (pp). <strong>Watch the firm travel, then drag it yourself.</strong></p>
          <div class="callout reveal ${c.flag('curve/0') ? 'is-open' : ''}" id="curve0-callout">On a curve, the response to a push depends on where you stand. A push worth 38 points in the middle of the curve is worth 4 near the top and less than 1 at the bottom, and it is the same push.</div>`,
        below: `<div class="index-panel attached"><div class="controls"><div class="control" style="flex:1;min-width:260px"><label for="curve0-pos">the firm's position on the index (or drag it)</label><input id="curve0-pos" class="latent" type="range" min="-3.6" max="2.2" step="0.05" value="-1.7"><div class="ticks"><span>−3.6</span><span>+2.2</span></div></div></div></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const cs = curveStage(svg, { stripLabel: 'the index (latent scale): the push is always +1 here, whatever it is worth above' });
          const g = V.el('g', {}, svg);
          let e0 = -1.7, seenMid = false, seenEnd = false;
          const stripA = V.el('line', { x1: 0, x2: 0, y1: 324, y2: 338, stroke: 'var(--amber)', 'stroke-width': 2 }, g);
          const stripB = V.el('line', { x1: 0, x2: 0, y1: 324, y2: 338, stroke: 'var(--amber)', 'stroke-width': 2, 'stroke-dasharray': '2 2' }, g);
          const push = V.el('path', { 'marker-end': 'url(#arrowAmber)', stroke: 'var(--amber)', 'stroke-width': 2, fill: 'none' }, g);
          const pushT = V.text(g, 0, 370, '+1', 'latent-text', { 'text-anchor': 'middle', style: 'fill: var(--amber)' });
          const vA = V.el('line', { class: 'window-edge' }, g), vB = V.el('line', { class: 'window-edge' }, g);
          const hA = V.el('line', { class: 'window-edge' }, g), hB = V.el('line', { class: 'window-edge' }, g);
          const ghost = V.el('circle', { class: 'dot ghost', r: 8 }, g);
          const firm = V.el('circle', { class: 'dot', r: 9, style: 'cursor:grab' }, g);
          const brG = V.el('g', {}, g);
          const note = V.text(g, 0, 0, '', 'label-muted', { 'text-anchor': 'middle' });
          const hit = V.el('rect', { x: 0, y: 0, width: W, height: H, class: 'hit drag' }, svg);
          const slider = api.below.querySelector('#curve0-pos');
          const open = () => { api.flag('curve/0', true); const c = document.getElementById('curve0-callout'); if (c) c.classList.add('is-open'); };
          function draw() {
            const e1 = e0 + 1, pA = L.G(e0), pB = L.G(e1);
            firm.setAttribute('cx', cs.sx(e0)); firm.setAttribute('cy', cs.sy(pA));
            ghost.setAttribute('cx', cs.sx(e1)); ghost.setAttribute('cy', cs.sy(pB));
            stripA.setAttribute('x1', cs.sx(e0)); stripA.setAttribute('x2', cs.sx(e0));
            stripB.setAttribute('x1', cs.sx(e1)); stripB.setAttribute('x2', cs.sx(e1));
            push.setAttribute('d', 'M' + cs.sx(e0) + ' 358 H ' + (cs.sx(e1) - 5)); pushT.setAttribute('x', (cs.sx(e0) + cs.sx(e1)) / 2);
            vA.setAttribute('x1', cs.sx(e0)); vA.setAttribute('x2', cs.sx(e0)); vA.setAttribute('y1', cs.sy(pA)); vA.setAttribute('y2', 322);
            vB.setAttribute('x1', cs.sx(e1)); vB.setAttribute('x2', cs.sx(e1)); vB.setAttribute('y1', cs.sy(pB)); vB.setAttribute('y2', 322);
            const flip = e1 > 2.0, bx = flip ? cs.sx(e0) - 22 : cs.sx(e1) + 22;
            hA.setAttribute('x1', cs.sx(e0)); hA.setAttribute('x2', bx); hA.setAttribute('y1', cs.sy(pA)); hA.setAttribute('y2', cs.sy(pA));
            hB.setAttribute('x1', cs.sx(e1)); hB.setAttribute('x2', bx); hB.setAttribute('y1', cs.sy(pB)); hB.setAttribute('y2', cs.sy(pB));
            brG.innerHTML = '';
            const gain = pB - pA;
            bracket(brG, flip ? cs.sx(e0) - 24 : cs.sx(e1) + 24, cs.sy(pA), cs.sy(pB), fmtPts(gain), flip ? 'left' : 'right', gain > 0.2 ? 'label-blue' : '');
            const mid = Math.abs(e0 + 0.5) < 0.7, end = (e0 < -2.6 || e1 > 2.6);
            if (mid) seenMid = true; if (end) seenEnd = true;
            note.setAttribute('x', V.clamp(cs.sx(e0 + 0.5), 210, 470)); note.setAttribute('y', Math.min(cs.sy(pA) - 22, cs.sy(pB) - 22));
            note.textContent = end ? 'out here the same push is worth almost nothing' : (mid ? 'here it is worth the most' : '');
            slider.value = e0.toFixed(2);
            if (seenMid && seenEnd && !api.flag('curve/0')) open();
          }
          api.onCleanup(V.drag(svg, hit, (p) => { e0 = V.clamp(cs.sx.inv(p.x) - 0.5, -3.6, 2.2); draw(); }));
          slider.addEventListener('input', () => { e0 = parseFloat(slider.value); draw(); });
          draw();
          if (!api.flag('curve/0')) { if (reduced) open(); else glide(api, slider, [1.75, -1.7], { ms: 1800 }); }
        }
      },
      {
        title: 'The interaction effect', stage: true,
        prose: (c) => `
          <p class="kicker">The curve</p>
          <h2>Two characteristics, and nothing linking them</h2>
          <p>Give the firm two characteristics: what it invests in the new market (<em>x</em>) and its experience (<em>z</em>). Each simply adds to the index. Nothing in this model ties one to the other.</p>
          <p>The chart shows what one more standard deviation of investment is worth, twice: for the firm as it is (left bracket), and for the same firm with one standard deviation more experience (right bracket). The difference between the two brackets is the <strong>interaction effect</strong>: how much experience changes what investment is worth. The hypothesis is a claim about this number.</p>
          <p><strong>Watch the firm move up the curve</strong>, then move it yourself.</p>
          <div class="callout reveal ${c.flag('curve/1') ? 'is-open' : ''}" id="curve1-callout">Experience changes what investment is worth, although nothing in the model links the two: on a curve, every variable moderates every other, simply by moving firms along it. Low on the curve each push makes the next worth more, so the interaction effect is positive; high on the curve it turns negative. Every firm has its own.</div>`,
        below: `<div class="index-panel attached"><div class="controls"><div class="control" style="flex:1;min-width:240px"><label for="curve1-c">Everything else about the firm, on the index (move it)</label><input id="curve1-c" class="latent" type="range" min="-1" max="1.5" step="0.05" value="0"><span class="val" id="curve1-cv"></span></div></div></div>
          <div class="controls"><div class="control" style="min-width:200px"><label for="curve1-z">Experience z</label><input id="curve1-z" type="range" min="-1.5" max="1.5" step="0.05" value="-0.5"><span class="val" id="curve1-zv"></span></div>
          <div class="readout"><div class="r"><span class="k">effect of x at z</span><span class="v" id="curve1-e1"></span></div><div class="r"><span class="k">effect of x at z + 1</span><span class="v" id="curve1-e2"></span></div><div class="r"><span class="k">interaction effect</span><span class="v blue" id="curve1-ie"></span></div></div></div>`,
        mount: function (api) {
          const svg = V.svg(api.stage, W, H);
          const cs = curveStage(svg, { stripLabel: 'index = −1.4 + 0.8·x + 0.8·z + everything else    (no x·z term)' });
          const g = V.el('g', {}, svg);
          const dots = [0, 1, 2, 3].map((k) => V.el('circle', { class: k % 2 ? 'dot ghost' : 'dot', r: 7 }, g)); // solid: the firm; hollow: after +1 SD of investment, as on the step before
          const ieT = V.text(g, 78, 62, '', 'label-strong');
          const br1 = V.el('g', {}, g), br2 = V.el('g', {}, g);
          const lab1 = V.text(g, 0, 0, 'at z', 'label-muted', { 'text-anchor': 'middle' }), lab2 = V.text(g, 0, 0, 'at z + 1', 'label-muted', { 'text-anchor': 'middle' });
          const zin = api.below.querySelector('#curve1-z'), cin = api.below.querySelector('#curve1-c');
          const q = (id) => api.below.querySelector(id);
          let sawPos = false, sawNeg = false;
          const open = () => { api.flag('curve/1', true); const cc = document.getElementById('curve1-callout'); if (cc) cc.classList.add('is-open'); };
          function draw() {
            const z = parseFloat(zin.value), c = parseFloat(cin.value);
            q('#curve1-zv').textContent = 'z = ' + z.toFixed(2); q('#curve1-cv').textContent = (c >= 0 ? '+' : '−') + Math.abs(c).toFixed(2) + ' on the index';
            const e = [[B0 + 0.8 * z + c, B0 + 0.8 + 0.8 * z + c], [B0 + 0.8 * (z + 1) + c, B0 + 0.8 + 0.8 * (z + 1) + c]];
            const p = e.map((r) => r.map(L.G));
            dots[0].setAttribute('cx', cs.sx(e[0][0])); dots[0].setAttribute('cy', cs.sy(p[0][0]));
            dots[1].setAttribute('cx', cs.sx(e[0][1])); dots[1].setAttribute('cy', cs.sy(p[0][1]));
            dots[2].setAttribute('cx', cs.sx(e[1][0])); dots[2].setAttribute('cy', cs.sy(p[1][0]));
            dots[3].setAttribute('cx', cs.sx(e[1][1])); dots[3].setAttribute('cy', cs.sy(p[1][1]));
            br1.innerHTML = ''; br2.innerHTML = '';
            const x1 = cs.sx(e[0][0]) - 16, x2 = cs.sx(e[1][1]) + 16;
            bracket(br1, x1, cs.sy(p[0][0]), cs.sy(p[0][1]), fmtPts(p[0][1] - p[0][0]), 'left');
            bracket(br2, x2, cs.sy(p[1][0]), cs.sy(p[1][1]), fmtPts(p[1][1] - p[1][0]), 'right');
            lab1.setAttribute('x', (cs.sx(e[0][0]) + cs.sx(e[0][1])) / 2); lab1.setAttribute('y', cs.sy(p[0][0]) + 26);
            lab2.setAttribute('x', (cs.sx(e[1][0]) + cs.sx(e[1][1])) / 2); lab2.setAttribute('y', cs.sy(p[1][1]) - 16);
            const d1 = p[0][1] - p[0][0], d2 = p[1][1] - p[1][0], ie = d2 - d1;
            q('#curve1-e1').textContent = fmtPts(d1); q('#curve1-e2').textContent = fmtPts(d2);
            ieT.textContent = 'interaction effect: ' + fmtPts(d2) + ' minus ' + fmtPts(d1) + ' = ' + fmtPts(ie); ieT.setAttribute('class', ie > 0.0005 ? 'label-pos' : (ie < -0.0005 ? 'label-neg' : 'label-strong'));
            const ieEl = q('#curve1-ie'); ieEl.textContent = fmtPts(ie); ieEl.className = 'v ' + (ie > 0.0005 ? 'pos' : (ie < -0.0005 ? 'neg' : ''));
            if (ie > 0.005) sawPos = true; if (ie < -0.005) sawNeg = true;
            if (sawPos && sawNeg && !api.flag('curve/1')) open();
          }
          zin.addEventListener('input', draw); cin.addEventListener('input', draw);
          draw();
          if (!api.flag('curve/1')) { if (reduced) open(); else glide(api, cin, [1.5, 0], { ms: 1900, delay: 900 }); }
        }
      }
    ]
  });

  // ======================================================================
  // 4–5 — coef
  // ======================================================================
  function indexPanelHtml(b3, extra) {
    return `<span class="lbl">the model, on the index</span>index = <span class="dim">β<sub>0</sub></span> + 0.8·x + 0.8·z + <span class="b3">${b3}</span>·x·z + controls${extra || ''}`;
  }
  App.registerDeck({
    id: 'coef', title: 'The coefficient', short: 'The coefficient',
    slides: [
      {
        title: 'Place your bet', stage: true, gate: true, gateHint: 'Place your bet first',
        prose: (c) => `
          <p class="kicker">The coefficient</p>
          <h2>How it gets tested: the product term</h2>
          <p>To test it, researchers add x·z to the model, the <em>product term</em> (or interaction term), and read the verdict off its coefficient, β<sub>3</sub>: its sign and its p-value.</p>
          <p>So let's see what β<sub>3</sub> knows, in a simulated world where we set the truth (the one used in the paper behind this explainer): ten thousand firms on the same curve, 17 in 100 succeeding. Each firm's interaction effect will be a dot; the big marker is their average, the <strong>average interaction effect</strong>.</p>
          <p><strong>A bet.</strong> Set β<sub>3</sub> to exactly zero, as if there were no product term at all. Where does the average interaction effect land?</p>
          <div class="chips" id="coef0-chips">
            <button class="chip" type="button" data-bet="zero">Exactly zero</button>
            <button class="chip" type="button" data-bet="pos">Positive</button>
            <button class="chip" type="button" data-bet="neg">Negative</button>
          </div>
          <div class="callout reveal" id="coef0-reveal"></div>`,
        below: `<div class="index-panel attached" id="coef0-panel">${indexPanelHtml('0.00')}</div>`,
        mount: function (api) {
          const m = mech();
          const svg = V.svg(api.stage, W, H);
          const sw = swarm(svg, { y: 240, spread: 70, min: -0.25, max: 0.25, ticks: [-0.2, -0.1, 0, 0.1, 0.2] });
          sw.sw.setAttribute('opacity', 0); sw.est.setAttribute('opacity', 0); sw.lab.setAttribute('opacity', 0);
          V.text(svg, 70, 40, 'Interaction effects and their average', 'label-strong');
          V.text(svg, 70, 60, 'β₃ = 0: no product term in the model', 'label-muted');
          const ie = E.ieVector(m.pop, m.bZero, L);
          const aie = E.aieDD(m.pop, m.bZero, L);
          betChips(api, 'coef0-chips', 'pos', (bet, animate) => {
            sw.update(ie, Math.ceil(m.pop.N / 1500), aie, null, 'average: ' + V.fmtPP(aie));
            fanOut(sw, animate);
            const r = document.getElementById('coef0-reveal');
            const pos = Math.round(100 * Array.from(ie).filter((v) => v > 0).length / ie.length);
            const said = bet === 'zero' ? 'You said zero, and so does the coefficient.' : bet === 'pos' ? 'You said positive, and you were right.' : 'You said negative. It is not.';
            r.innerHTML = `${said} With β<sub>3</sub> at exactly zero the average interaction effect is <strong>${V.fmtPP(aie)}</strong>, positive for ${pos}% of the firms. Curvature alone made it: with 17 in 100 succeeding, most firms stand low on the curve, where each push makes the next worth more. <strong>A coefficient of zero, and a real effect.</strong>`;
            r.classList.add('is-open');
            api.unlock();
          }, 'coef0-bet');
        }
      },
      {
        title: 'Find the zero', stage: true,
        prose: (c) => `
          <p class="kicker">The coefficient</p>
          <h2>The reverse: a significant coefficient, and no effect on average</h2>
          <p><strong>Watch β<sub>3</sub> slide</strong> until it cancels the curvature's +4 points and the average interaction effect sits on exactly zero. Then take the slider yourself.</p>
          <div class="callout reveal ${c.flag('coef/1') ? 'is-open' : ''}" id="coef1-reveal">It takes a <strong>negative</strong> coefficient, about −0.20. Now draw a sample of 7,500 firms from this world and fit the model, as a researcher would. β<sub>3</sub> comes back with a p-value far below .001, sample after sample, and the write-up says that experience <em>weakens</em> the effect of investment. On average it does nothing: it helps some firms and hurts others, and the two cancel. The coefficient fails both ways: zero beside a real effect, significant beside none.</div>
          <p class="reveal ${c.flag('coef/1') ? 'is-open' : ''}" id="coef1-objection">And the hypotheses are about probabilities: of the 150 formal moderation hypotheses in the 202 articles, not one is stated on the log-odds scale where the coefficient lives. <a class="door" data-go="gallery/0" href="#gallery/0">Five more cases where coefficient and effect disagree</a></p>`,
        below: `<div class="index-panel attached" id="coef1-console"><div class="controls"><div class="control" style="flex:1;min-width:280px"><label for="coef1-b3">β<sub>3</sub>, the product-term coefficient</label><input id="coef1-b3" class="latent" type="range" min="-0.45" max="0.3" step="0.005" value="0"><div class="ticks"><span>−0.45</span><span>+0.30</span></div></div></div><div id="coef1-panel" style="margin-top:8px">${indexPanelHtml('+0.000')}</div></div>`,
        mount: function (api) {
          const m = mech();
          const svg = V.svg(api.stage, W, H);
          const sw = swarm(svg, { y: 240, spread: 70, min: -0.25, max: 0.25, ticks: [-0.2, -0.1, 0, 0.1, 0.2] });
          V.text(svg, 70, 40, 'Interaction effects and their average', 'label-strong');
          const sub = V.text(svg, 70, 60, '', 'label-muted');
          const ach = document.createElement('div'); ach.className = 'achieve'; ach.hidden = true; ach.textContent = 'Average interaction effect: zero'; api.stage.appendChild(ach);
          const b3in = api.below.querySelector('#coef1-b3'), panel = api.below.querySelector('#coef1-panel');
          let found = api.flag('coef/1') || false;
          const target = parseFloat(m.bNull.b3.toFixed(3));
          if (found) b3in.value = target;
          function draw() {
            const b3 = parseFloat(b3in.value);
            const beta = E.solveB0(m.pop, Object.assign({}, m.base, { b3: b3 }), L, 0.17);
            const ie = E.ieVector(m.pop, beta, L), aie = E.aieDD(m.pop, beta, L);
            sw.update(ie, Math.ceil(m.pop.N / 1500), aie, null, 'average: ' + V.fmtPP(aie));
            const pos = Math.round(100 * Array.from(ie).filter((v) => v > 0).length / ie.length);
            sub.textContent = 'positive for ' + pos + '% of firms, negative for ' + (100 - pos) + '%';
            const near = Math.abs(aie) < 0.0015;
            let extra = '';
            const console_ = document.getElementById('coef1-console'); if (console_) console_.classList.toggle('is-null', near);
            if (near && !found) {
              found = true; api.flag('coef/1', true);
              document.getElementById('coef1-reveal').classList.add('is-open'); document.getElementById('coef1-objection').classList.add('is-open');
              if (!reduced) { const ring = V.el('circle', { class: 'ring', cx: sw.est.getAttribute('cx'), cy: sw.est.getAttribute('cy'), r: 9 }, svg); setTimeout(() => ring.remove(), 800); }
            }
            if (near) { const s = mechSample(); extra = `<span class="badge sig">in one sample of 7,500: ${V.fmtP(s.pCoef)}</span>`; }
            ach.hidden = !near;
            panel.innerHTML = indexPanelHtml((b3 >= 0 ? '+' : '−') + Math.abs(b3).toFixed(3), extra);
          }
          b3in.addEventListener('input', draw);
          draw();
          if (!found) glide(api, b3in, [target], { ms: 2600, delay: 900 });
        }
      }
    ]
  });

  // ======================================================================
  // 6 — plot
  // ======================================================================
  function twoLineStage(svg, o) {
    o = o || {};
    const sx = V.scale(o.x0 == null ? -1 : o.x0, o.x1 == null ? 1 : o.x1, 70, 600), sy = V.scale(0, o.pmax || 0.5, 330, 40);
    const g = V.el('g', {}, svg);
    const grid = V.el('g', { class: 'grid' }, g);
    [0.1, 0.2, 0.3, 0.4, 0.6, 0.8].forEach((p) => { if (p < (o.pmax || 0.5)) V.el('line', { x1: sx.r0, x2: sx.r1, y1: sy(p), y2: sy(p) }, grid); });
    V.axisY(g, sy, 70, { ticks: o.yticks || [0, .1, .2, .3, .4, .5], fmt: (t) => t.toFixed(1), label: 'Pr(success)', labelDx: 46 });
    V.axisX(g, sx, 330, { ticks: o.xticks || [-1, -0.5, 0, 0.5, 1], fmt: (t) => (t > 0 ? '+' : '') + t, label: o.xlabel || 'Investment x (in standard deviations)' });
    return { g: g, sx: sx, sy: sy };
  }
  App.registerDeck({
    id: 'plot', title: 'The plot', short: 'The plot',
    slides: [
      {
        title: 'Slide the window', stage: true, gate: true, gateHint: 'Place your bet first',
        prose: (c) => `
          <p class="kicker">The plot</p>
          <h2>Surely a plot would show it?</h2>
          <p>This is the display everyone draws, here for the world you just watched, where the average interaction effect is exactly zero. Predicted success against investment, for firms with low experience (solid) and high experience (dashed), over the usual window: one standard deviation either side of the mean.</p>
          <p>The gap widens from 11 to 35 points. The eye says: strong positive moderation.</p>
          <p><strong>A bet.</strong> Had the window been drawn further to the right, the gap between the lines would…</p>
          <div class="chips" id="plot0-chips">
            <button class="chip" type="button" data-bet="wider">keep widening</button>
            <button class="chip" type="button" data-bet="same">stay the same</button>
            <button class="chip" type="button" data-bet="narrow">narrow</button>
          </div>
          <div class="callout reveal" id="plot0-reveal"></div>`,
        below: `<div class="controls"><div class="control" style="flex:1;min-width:240px"><label for="plot0-w">window position (or drag it)</label><input id="plot0-w" type="range" min="-3" max="1" step="0.05" value="-1" disabled></div></div><div class="readout"><div class="r"><span class="k">gap at left edge</span><span class="v" id="plot0-g1"></span></div><div class="r"><span class="k">gap at right edge</span><span class="v" id="plot0-g2"></span></div><div class="r"><span class="k">the eye's verdict</span><span class="v" id="plot0-verdict"></span></div></div>`,
        mount: function (api) {
          const m = mech();
          const svg = V.svg(api.stage, W, H);
          const s = twoLineStage(svg, { x0: -3, x1: 3, pmax: 0.9, yticks: [0, .2, .4, .6, .8], xticks: [-3, -2, -1, 0, 1, 2, 3] });
          V.el('rect', { x: s.sx.r0, y: 40, width: s.sx.r1 - s.sx.r0, height: 290, class: 'dusk' }, s.g);
          const win = V.el('rect', { class: 'window lit', y: 40, height: 290 }, s.g);
          const xs = []; for (let x = -3; x <= 3.0001; x += 0.1) xs.push(+x.toFixed(2));
          const hi = E.twoLine(m.pop, m.bNull, L, 1, xs, 5), lo = E.twoLine(m.pop, m.bNull, L, -1, xs, 5);
          const bins = new Array(30).fill(0); for (let i = 0; i < m.pop.N; i++) { const b = Math.floor((m.pop.x[i] + 3) / 0.2); if (b >= 0 && b < 30) bins[b]++; }
          const bmax = Math.max.apply(null, bins);
          bins.forEach((c, k) => V.el('rect', { x: s.sx(-3 + k * 0.2) + 1, y: 330 - 26 * c / bmax, width: (s.sx(0.2) - s.sx(0)) - 2, height: 26 * c / bmax, fill: 'var(--rule)', opacity: .9 }, s.g));
          V.text(s.g, 598, 318, 'where firms are', 'label-muted', { 'text-anchor': 'end' });
          // what lies outside the paper's window stays dark until the bet is placed
          const duskG = V.el('g', { style: 'opacity: 0; transition: opacity .8s ease' }, s.g);
          V.text(duskG, 596, s.sy(hi[hi.length - 1]) - 8, 'z = +1 SD', 'label-muted', { 'text-anchor': 'end' });
          V.text(duskG, 596, s.sy(lo[lo.length - 1]) + 18, 'z = −1 SD', 'label-muted', { 'text-anchor': 'end' });
          const e1 = V.el('line', { class: 'window-edge', y1: 40, y2: 330 }, s.g), e2 = V.el('line', { class: 'window-edge', y1: 40, y2: 330 }, s.g);
          const clip = V.el('clipPath', { id: 'plot0-clip' }, svg), clipR = V.el('rect', { y: 40, height: 290 }, clip);
          const dLo = V.path(xs.map((x, i) => [s.sx(x), s.sy(lo[i])])), dHi = V.path(xs.map((x, i) => [s.sx(x), s.sy(hi[i])]));
          V.el('path', { d: dLo, class: 'curve dusk' }, duskG); V.el('path', { d: dHi, class: 'curve dashed dusk' }, duskG);
          const litG = V.el('g', { 'clip-path': 'url(#plot0-clip)' }, s.g);
          V.el('path', { d: dLo, class: 'curve' }, litG); V.el('path', { d: dHi, class: 'curve dashed' }, litG);
          let prevWid = null;
          const brG = V.el('g', {}, s.g);
          const handle = V.el('rect', { class: 'handle', rx: 6, width: 54, height: 22, y: 48, style: 'cursor:grab' }, s.g);
          const ht = V.text(s.g, 0, 63, '⇔ drag', 'label-muted', { 'text-anchor': 'middle', 'pointer-events': 'none' });
          const hit = V.el('rect', { x: 0, y: 0, width: W, height: 330, class: 'hit drag' }, svg);
          const q = (id) => api.below.querySelector(id);
          const slider = q('#plot0-w');
          let w0 = -1, armed = !!api.get('plot0-bet');
          const gapAt = (x) => E.meanP(m.pop, m.bNull, L, x, 1, 5) - E.meanP(m.pop, m.bNull, L, x, -1, 5);
          function arm() { armed = true; slider.disabled = false; handle.setAttribute('opacity', 1); ht.setAttribute('opacity', 1); duskG.style.opacity = 1; }
          function draw() {
            const a = w0, b = w0 + 2;
            win.setAttribute('x', s.sx(a)); win.setAttribute('width', s.sx(b) - s.sx(a));
            clipR.setAttribute('x', s.sx(a)); clipR.setAttribute('width', s.sx(b) - s.sx(a));
            e1.setAttribute('x1', s.sx(a)); e1.setAttribute('x2', s.sx(a)); e2.setAttribute('x1', s.sx(b)); e2.setAttribute('x2', s.sx(b));
            handle.setAttribute('x', s.sx(a + 1) - 27); ht.setAttribute('x', s.sx(a + 1));
            const g1 = gapAt(a), g2 = gapAt(b);
            brG.innerHTML = '';
            const lo1 = E.meanP(m.pop, m.bNull, L, a, -1, 5), lo2 = E.meanP(m.pop, m.bNull, L, b, -1, 5);
            bracket(brG, s.sx(a) + 6, s.sy(lo1), s.sy(lo1 + g1), Math.round(100 * g1) + ' pp', 'right');
            bracket(brG, s.sx(b) - 6, s.sy(lo2), s.sy(lo2 + g2), Math.round(100 * g2) + ' pp', 'left');
            q('#plot0-g1').textContent = Math.round(100 * g1) + ' pp'; q('#plot0-g2').textContent = Math.round(100 * g2) + ' pp';
            const wid = g2 > g1;
            const flip = prevWid != null && wid !== prevWid; prevWid = wid;
            q('#plot0-verdict').innerHTML = '<span class="verdict ' + (wid ? 'pos' : 'neg') + (flip ? ' is-flip' : '') + '">' + (wid ? 'gap widens: "positive moderation"' : 'gap narrows: "negative moderation"') + '</span>';
            slider.value = w0.toFixed(2);
            if (armed && !wid) api.flag('plot/0:seen', true);
          }
          function revealText() {
            const r = document.getElementById('plot0-reveal');
            const bet = api.get('plot0-bet');
            r.innerHTML = (bet === 'narrow' ? 'You said it would narrow, and it does: watch.' : bet === 'wider' ? 'You said it would keep widening. Watch: it narrows.' : 'You said it would stay the same. Watch: it narrows.') + ' Once the window starts to the right of about +0.3, the gap is smaller at its right edge than at its left: the eye reads negative moderation, and nothing about the world changed. <strong>A widening gap tells you where the effect is positive, not whether it is positive on average.</strong> Here the average is zero. <a class="door" data-go="window/0" href="#window/0">Inside the plot: what it conceals</a>';
            r.classList.add('is-open');
          }
          handle.setAttribute('opacity', 0); ht.setAttribute('opacity', 0);
          api.onCleanup(V.drag(svg, hit, (p) => { if (!armed) return; w0 = V.clamp(s.sx.inv(p.x) - 1, -3, 1); draw(); }));
          slider.addEventListener('input', () => { w0 = parseFloat(slider.value); draw(); });
          draw();
          betChips(api, 'plot0-chips', null, (bet, animate) => {
            arm(); api.unlock(); revealText();
            if (!api.flag('plot/0:seen')) glide(api, slider, [0.7], { ms: 2400, delay: animate ? 500 : 900 });
          }, 'plot0-bet');
        }
      }
    ]
  });

  // ---------- side room: inside the plot ----------
  const backLink = `<p style="margin-top:22px"><a class="door is-back" data-go="back" href="#">Back to the path</a></p>`;
  App.registerDeck({
    id: 'window', title: 'Inside the plot', short: 'Inside the plot', parent: 'plot', parentIdx: 0,
    slides: [
      {
        title: 'What the display conceals', stage: true,
        prose: `
          <p class="kicker">Side room · Inside the plot</p>
          <h2>What the display conceals</h2>
          <p>This is the interaction effect itself, firm by firm, laid out along investment: positive for firms to the left of about +0.3 standard deviations, negative for firms to the right, exactly the sign rule from the curve. Blue and orange are areas of opposite sign, and weighted by where the firms are, they cancel. The average is zero.</p>
          <p>The lit band is the window the paper showed. It sits almost entirely in the blue, which is why the gap widened there. <strong>A widening gap tells you where the effect is positive, not whether it is positive on average.</strong></p>
          <p class="small">The crossing point is a property of the curve and the coefficients, not of the data, so no amount of data moves it. The paper's Figure 2c is this picture.</p>`,
        mount: function (api) {
          const m = mech();
          const svg = V.svg(api.stage, W, H);
          const sx = V.scale(-3, 3, 70, 600);
          const xs = []; for (let x = -3; x <= 3.0001; x += 0.1) xs.push(+x.toFixed(2));
          const ie = xs.map((x) => E.pointwiseIE(m.pop, m.bNull, L, x, 5));
          const mx = Math.max.apply(null, ie.map(Math.abs));
          const sy = V.scale(-mx * 1.15, mx * 1.15, 320, 50);
          const g = V.el('g', {}, svg);
          V.el('rect', { x: sx.r0, y: 50, width: sx.r1 - sx.r0, height: 270, class: 'dusk' }, g);
          V.el('rect', { x: sx(-1), width: sx(1) - sx(-1), y: 50, height: 270, class: 'window lit' }, g);
          const posPts = xs.map((x, i) => [sx(x), sy(Math.max(ie[i], 0))]), negPts = xs.map((x, i) => [sx(x), sy(Math.min(ie[i], 0))]);
          V.el('path', { d: V.path(posPts) + 'L' + sx(3) + ' ' + sy(0) + 'L' + sx(-3) + ' ' + sy(0) + 'Z', class: 'area-pos' }, g);
          V.el('path', { d: V.path(negPts) + 'L' + sx(3) + ' ' + sy(0) + 'L' + sx(-3) + ' ' + sy(0) + 'Z', class: 'area-neg' }, g);
          V.el('line', { x1: sx.r0, x2: sx.r1, y1: sy(0), y2: sy(0), stroke: 'var(--ink-2)', 'stroke-width': 1 }, g);
          V.el('path', { d: V.path(xs.map((x, i) => [sx(x), sy(ie[i])])), class: 'curve' }, g);
          V.axisX(g, sx, 330, { ticks: [-3, -2, -1, 0, 1, 2, 3], fmt: (t) => (t > 0 ? '+' : '') + t, label: 'Investment x (in standard deviations)' });
          V.axisY(g, sy, 70, { ticks: [-0.05, 0, 0.05], fmt: (t) => (t > 0 ? '+' : '') + Math.round(100 * t) + ' pp', label: 'interaction effect at x', labelDx: 52 });
          V.text(g, sx(-2.1), sy(mx * 0.45), 'positive here', 'label-pos', { 'text-anchor': 'middle' });
          V.text(g, sx(2.35), sy(-mx * 0.45), 'negative here', 'label-neg', { 'text-anchor': 'middle' });
          V.text(g, sx(0), sy(-mx * 0.9), 'the plotted window', 'label-muted', { 'text-anchor': 'middle' });
          const bins = new Array(30).fill(0); for (let i = 0; i < m.pop.N; i++) { const b = Math.floor((m.pop.x[i] + 3) / 0.2); if (b >= 0 && b < 30) bins[b]++; }
          const bmax = Math.max.apply(null, bins);
          bins.forEach((c, k) => V.el('rect', { x: sx(-3 + k * 0.2) + 1, y: 330 - 18 * c / bmax, width: (sx(0.2) - sx(0)) - 2, height: 18 * c / bmax, fill: 'var(--rule)' }, g));
          let lo = -1, hi = 2; for (let k = 0; k < 30; k++) { const md = (lo + hi) / 2; if (E.pointwiseIE(m.pop, m.bNull, L, md, 5) > 0) lo = md; else hi = md; }
          const xc = (lo + hi) / 2;
          V.el('line', { x1: sx(xc), x2: sx(xc), y1: 66, y2: sy(0) + 30, class: 'zero soft' }, g);
          V.text(g, sx(xc) + 6, 62, 'crosses zero at x = ' + (xc >= 0 ? '+' : '') + xc.toFixed(2), 'label-muted');
        }
      },
      {
        title: 'Test two points, then', stage: true,
        prose: `
          <p class="kicker">Side room · Inside the plot</p>
          <h2>Then test the points</h2>
          <p>The plot's inferential cousin: the average marginal effect (AME) of investment at each level of experience, with a 95% band, from one fitted sample of 7,500 firms. Papers use it in two ways. Thirty-nine of the 202 articles test the effect <em>at</em> chosen points and call moderation when it is significant at one and not at another; the readout's first two lines do that for your two markers. Others test the <em>difference</em> between two chosen points, the third line.</p>
          <p><strong>Drag the two markers.</strong> The conventional choice, +1 against −1 standard deviations, comes back with a small p-value. Now move the pair.</p>
          <p>Both answer at the points you picked, and the answer moves with the picking. Testing each point separately never tests the difference at all. <a class="door" data-go="others/0" href="#others/0">Other repairs people have tried</a></p>` + backLink,
        below: `<div class="controls"><div class="control" style="min-width:200px"><label for="plot3-z1">z₁ (or drag the marker)</label><input id="plot3-z1" type="range" min="-2" max="2" step="0.1" value="-1"></div><div class="control" style="min-width:200px"><label for="plot3-z2">z₂</label><input id="plot3-z2" type="range" min="-2" max="2" step="0.1" value="1"></div></div><div class="readout"><div class="r"><span class="k">effect at z₁, on its own</span><span class="v" id="plot3-a1"></span></div><div class="r"><span class="k">effect at z₂, on its own</span><span class="v" id="plot3-a2"></span></div><div class="r"><span class="k">difference, z₂ minus z₁</span><span class="v" id="plot3-c"></span></div><div class="r"><span class="k">average interaction effect, same fit</span><span class="v blue" id="plot3-aie"></span></div></div>`,
        mount: function (api) {
          const s = mechSample(), curve = mechAme();
          const svg = V.svg(api.stage, W, H);
          const sx = V.scale(-2, 2, 70, 600), sy = V.scale(-0.02, 0.24, 320, 40);
          const g = V.el('g', {}, svg);
          const grid = V.el('g', { class: 'grid' }, g);
          [0.05, 0.1, 0.15, 0.2].forEach((p) => V.el('line', { x1: sx.r0, x2: sx.r1, y1: sy(p), y2: sy(p) }, grid));
          V.el('path', { d: V.path(curve.map((p) => [sx(p.z), sy(p.hi)])) + V.path(curve.slice().reverse().map((p) => [sx(p.z), sy(p.lo)])).replace('M', 'L') + 'Z', class: 'band' }, g);
          V.el('path', { d: V.path(curve.map((p) => [sx(p.z), sy(p.ame)])), class: 'curve' }, g);
          V.el('line', { x1: sx.r0, x2: sx.r1, y1: sy(0), y2: sy(0), class: 'zero' }, g);
          V.text(g, sx.r1 - 4, sy(0) - 6, 'zero', 'label-alarm', { 'text-anchor': 'end' });
          V.axisX(g, sx, 330, { ticks: [-2, -1, 0, 1, 2], fmt: (t) => (t > 0 ? '+' : '') + t, label: 'Experience z (in standard deviations)' });
          V.axisY(g, sy, 70, { ticks: [0, .05, .1, .15, .2], fmt: (t) => t.toFixed(2).replace(/^0/, ''), label: 'average effect of +1 SD of investment', labelDx: 48 });
          const ameAt = (z) => { let best = curve[0]; curve.forEach((p) => { if (Math.abs(p.z - z) < Math.abs(best.z - z)) best = p; }); return best; };
          const mk = [-1, 1].map((z, k) => {
            const gg = V.el('g', {}, g);
            V.el('line', { class: 'window-edge', y1: 40, y2: 330 }, gg);
            V.el('circle', { class: 'handle blue', r: 9, style: 'cursor:grab' }, gg);
            V.text(gg, 0, 0, 'z' + (k ? '₂' : '₁'), 'label-strong', { 'text-anchor': 'middle' });
            return { g: gg, z: z };
          });
          const q = (id) => api.below.querySelector(id);
          function draw() {
            if (mk[0].z > mk[1].z) { const t = mk[0].z; mk[0].z = mk[1].z; mk[1].z = t; }
            mk.forEach((m) => {
              const p = ameAt(m.z);
              m.g.children[0].setAttribute('x1', sx(m.z)); m.g.children[0].setAttribute('x2', sx(m.z));
              m.g.children[1].setAttribute('cx', sx(m.z)); m.g.children[1].setAttribute('cy', sy(p.ame));
              m.g.children[2].setAttribute('x', sx(m.z)); m.g.children[2].setAttribute('y', 30);
            });
            const p1 = ameAt(mk[0].z), p2 = ameAt(mk[1].z);
            const own = (p) => V.fmtPP(p.ame) + (p.lo > 0 || p.hi < 0 ? ', significant' : ', not significant');
            q('#plot3-a1').textContent = own(p1); q('#plot3-a2').textContent = own(p2);
            const c = E.contrastDelta(s.d, s.fit, L, mk[0].z, mk[1].z);
            q('#plot3-c').textContent = V.fmtPP(c.est) + ', ' + V.fmtP(c.p);
            q('#plot3-c').className = 'v ' + (c.p < .05 ? 'alarm' : '');
            q('#plot3-aie').textContent = V.fmtPP(s.aie.aie) + ' [' + V.fmtPP(s.aie.lo) + ', ' + V.fmtPP(s.aie.hi) + '], ' + V.fmtP(s.aie.p);
            q('#plot3-z1').value = mk[0].z; q('#plot3-z2').value = mk[1].z;
          }
          mk.forEach((m) => api.onCleanup(V.drag(svg, m.g.children[1], (p) => { m.z = V.clamp(Math.round(sx.inv(p.x) * 10) / 10, -2, 2); draw(); })));
          q('#plot3-z1').addEventListener('input', () => { mk[0].z = parseFloat(q('#plot3-z1').value); draw(); });
          q('#plot3-z2').addEventListener('input', () => { mk[1].z = parseFloat(q('#plot3-z2').value); draw(); });
          draw();
        }
      },
    ]
  });

  // ======================================================================
  // 7 — aie
  // ======================================================================
  App.registerDeck({
    id: 'aie', title: 'The average interaction effect', short: 'The average',
    slides: [
      {
        title: 'The quantity that answers', stage: true, cls: 'wide-prose',
        prose: `
          <p class="kicker">The average interaction effect</p>
          <h2>From one sample: the effect itself, with an interval</h2>
          <p>So far we knew the truth, because we made the world. A researcher has one sample. Draw 7,500 firms and fit the model: the coefficient on x·z comes back negative and significant (the dark strip).</p>
          <p>Now compute each firm's interaction effect from the fitted model and average them. That is the <strong>average interaction effect</strong> (AIE) as an estimate, with a standard error that carries the uncertainty of every coefficient. Here it is indistinguishable from zero, within about a point: the right answer, from the same fit that gave a significant coefficient and a widening plot. It is one line after the model:</p>
          <pre class="code"><span class="lbl">Stata</span>
probit y c.x##c.z w1 w2
ginteff, firstdiff(x z)
<span class="lbl">R</span>
m <- glm(y ~ x * z + w1 + w2, family = binomial("probit"))
ginteff(m, firstdiff = c("x", "z"))</pre>
          <p class="small"><code>ginteff</code> is Radean's (2023) Stata command; the paper adds an R package with the same interface, for binary, ordered, multinomial and fractional outcomes. <code>w1</code> and <code>w2</code> are other firm characteristics. The effect is for one more unit of each variable, here one standard deviation; say so when you report it. <a class="door" data-go="families/0" href="#families/0">Ordered, multinomial and fractional outcomes</a></p>`,
        below: `<div class="readout"><div class="r"><span class="k">product-term coefficient (latent scale)</span><span class="v" id="aie0-coef"></span></div><div class="r"><span class="k">average interaction effect, same fit</span><span class="v blue" id="aie0-aie"></span></div></div>`,
        mount: function (api) {
          const s = mechSample();
          const svg = V.svg(api.stage, W, H);
          const MY = 128;
          const sw = swarm(svg, { y: 255, spread: 72, min: -0.25, max: 0.25, ticks: [-0.2, -0.1, 0, 0.1, 0.2], markerY: MY, label: 'interaction effect for one firm (percentage points), from the fitted model' });
          V.el('rect', { x: 66, y: 22, width: 372, height: 42, rx: 6, class: 'latent-box' }, svg);
          V.el('line', { x1: 70, x2: 434, y1: 22.5, y2: 22.5, class: 'seam-line' }, svg);
          V.text(svg, 78, 38, 'coefficient on x·z, latent scale (probit, n = 7,500)', 'latent-dim');
          V.text(svg, 78, 55, V.fmtSigned(s.fit.beta[3], 3) + '   ' + V.fmtP(s.pCoef), 'latent-text', { style: 'fill: var(--amber)' });
          const stride = Math.ceil(s.d.N / 1500), a = s.aie;
          const label = 'AIE ' + V.fmtPP(a.aie) + '  [' + V.fmtPP(a.lo) + ', ' + V.fmtPP(a.hi) + ']  ' + V.fmtP(a.p);
          api.below.querySelector('#aie0-coef').textContent = V.fmtSigned(s.fit.beta[3], 3) + ', ' + V.fmtP(s.pCoef);
          api.below.querySelector('#aie0-aie').textContent = V.fmtPP(a.aie) + ' [' + V.fmtPP(a.lo) + ', ' + V.fmtPP(a.hi) + '], ' + V.fmtP(a.p);
          sw.update(s.ie, stride, null);
          sw.est.setAttribute('opacity', 0); sw.lab.setAttribute('opacity', 0);
          const paint = () => { sw.update(s.ie, stride, a.aie, [a.lo, a.hi], label); sw.est.setAttribute('opacity', 1); sw.lab.setAttribute('opacity', 1); api.flag('aie/0', true); };
          if (reduced || api.flag('aie/0')) { paint(); return; }
          // the dots fly to their mean and return: that is what "average" means here
          let raf = 0, timer = 0;
          api.onCleanup(() => { cancelAnimationFrame(raf); clearTimeout(timer); });
          timer = setTimeout(() => {
            const from = sw.dots.map((d) => [parseFloat(d.getAttribute('cx')), parseFloat(d.getAttribute('cy'))]);
            const tx = sw.sx(a.aie), t0 = performance.now(), dur = 900;
            const step = (now) => {
              const t = Math.max(0, Math.min(1, (performance.now() - t0) / dur)), e = 1 - Math.pow(1 - t, 3);
              sw.dots.forEach((d, k) => { d.setAttribute('cx', (from[k][0] + (tx - from[k][0]) * e).toFixed(1)); d.setAttribute('cy', (from[k][1] + (MY - from[k][1]) * e).toFixed(1)); });
              if (t < 1) raf = requestAnimationFrame(step);
              else timer = setTimeout(() => { sw.dots.forEach((d, k) => { d.setAttribute('cx', from[k][0]); d.setAttribute('cy', from[k][1]); }); paint(); }, 350);
            };
            raf = requestAnimationFrame(step);
          }, 800);
        }
      }
    ]
  });
})();
