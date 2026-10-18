/* app.js — the explorable's framework: deck registry, hash router, gates,
   progress persistence, the map, and small SVG helpers shared by the playables. */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'ctl-explorable-v2'; // v2: the short path (slide indices changed)
  const TRUNK = ['start', 'curve', 'coef', 'plot', 'aie', 'race', 'papers', 'now'];

  const App = {
    decks: {}, order: [], trunk: TRUNK, state: null,
    current: { deck: null, idx: 0 }, live: null, models: {}, els: {}
  };

  // ---------- persistence ----------
  function freshState() { return { visited: {}, last: {}, done: {}, bets: {}, flags: {}, from: {} }; }
  function loadState() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const o = JSON.parse(s); return Object.assign(freshState(), o); } } catch (e) { /* private mode etc. */ }
    return freshState();
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(App.state)); } catch (e) { /* ignore */ } }
  App.save = saveState;
  App.reset = function () { App.state = freshState(); saveState(); App.go('start', 0); };

  // ---------- registry ----------
  App.registerDeck = function (deck) {
    if (!deck || !deck.id || !deck.slides) throw new Error('bad deck');
    App.decks[deck.id] = deck; App._flat = null;
    if (App.order.indexOf(deck.id) < 0) App.order.push(deck.id);
  };
  App.isTrunk = function (id) { return TRUNK.indexOf(id) >= 0; };
  // the main path, flattened: every trunk stage in order (the bottom dots and the "4 of 13" count use it)
  App.flat = function () {
    if (!App._flat) { App._flat = []; TRUNK.forEach((d) => { if (App.decks[d]) App.decks[d].slides.forEach((S, i) => App._flat.push({ deck: d, idx: i, S: S })); }); }
    return App._flat;
  };

  // ---------- routing ----------
  function parseHash() {
    const h = (location.hash || '').replace(/^#/, '');
    const parts = h.split('/');
    const deck = parts[0] && App.decks[parts[0]] ? parts[0] : 'start';
    let idx = parseInt(parts[1], 10);
    if (isNaN(idx)) idx = (App.state.last[deck] != null ? App.state.last[deck] : 0);
    const n = App.decks[deck].slides.length;
    idx = Math.max(0, Math.min(n - 1, idx));
    return { deck: deck, idx: idx };
  }
  App.go = function (deck, idx) {
    if (!App.decks[deck]) deck = 'start';
    if (idx == null) idx = (App.state.last[deck] != null ? App.state.last[deck] : 0);
    const target = '#' + deck + '/' + idx;
    if (location.hash === target) render(); else location.hash = target;
  };
  App.next = function () {
    const { deck, idx } = App.current, D = App.decks[deck];
    if (idx < D.slides.length - 1) { if (gateLocked(deck, idx)) { nudge(); return; } App.go(deck, idx + 1); return; }
    if (App.isTrunk(deck)) {
      const k = TRUNK.indexOf(deck);
      if (k < TRUNK.length - 1 && App.decks[TRUNK[k + 1]]) App.go(TRUNK[k + 1], 0); else App.go('start', 0);
    } else { App.back(deck); }
  };
  App.prev = function () {
    const { deck, idx } = App.current;
    if (idx > 0) { App.go(deck, idx - 1); return; }
    if (App.isTrunk(deck)) {
      const k = TRUNK.indexOf(deck);
      if (k > 0) { const p = TRUNK[k - 1]; App.go(p, App.decks[p].slides.length - 1); }
    } else { App.back(deck); }
  };
  App.back = function (deck) {
    const from = App.state.from[deck];
    const D = App.decks[deck];
    if (from && App.decks[from.deck]) App.go(from.deck, from.idx);
    else if (D.parent) App.go(D.parent, D.parentIdx || 0);
    else App.go('start', 0);
  };

  // ---------- gates ----------
  function gateKey(deck, idx) { return deck + '/' + idx; }
  function gateLocked(deck, idx) {
    const S = App.decks[deck].slides[idx];
    if (!S.gate) return false;
    return !App.state.flags[gateKey(deck, idx)];
  }
  function nudge() {
    const b = App.els.next; if (!b) return;
    b.classList.add('is-nudge');
    setTimeout(() => b.classList.remove('is-nudge'), 500);
  }

  // ---------- rendering ----------
  function render() {
    const { deck, idx } = parseHash();
    const D = App.decks[deck], S = D.slides[idx];
    // unmount the previous slide
    if (App.live && App.live.cleanup) { try { App.live.cleanup.forEach((f) => f()); } catch (e) { console.error(e); } }
    App.live = null;
    App.current = { deck: deck, idx: idx };
    // progress bookkeeping
    const st = App.state;
    st.visited[deck] = st.visited[deck] || [];
    if (st.visited[deck].indexOf(idx) < 0) st.visited[deck].push(idx);
    st.last[deck] = idx;
    if (idx === D.slides.length - 1) st.done[deck] = true;
    saveState();

    const area = App.els.area;
    area.innerHTML = '';
    const sec = document.createElement('section');
    const layout = S.layout || (S.stage ? 'split' : 'prose');
    sec.className = 'slide layout-' + layout + (S.cls ? ' ' + S.cls : '');
    sec.setAttribute('aria-label', (D.title || deck) + ', slide ' + (idx + 1));
    const ctx = { state: st, deck: deck, idx: idx, get: (k) => st.bets[k], flag: (k) => st.flags[k] };
    const proseHtml = typeof S.prose === 'function' ? S.prose(ctx) : (S.prose || '');
    const prose = document.createElement('div');
    prose.className = 'prose';
    prose.innerHTML = proseHtml;
    let stageWrap = null;
    if (S.stage) {
      stageWrap = document.createElement('div');
      stageWrap.className = 'stage-col';
      const stage = document.createElement('div');
      stage.className = 'stage' + (S.stageCls ? ' ' + S.stageCls : '');
      stageWrap.appendChild(stage);
      if (S.caption) { const c = document.createElement('div'); c.className = 'stage-caption'; c.innerHTML = S.caption; stageWrap.appendChild(c); }
      if (S.below) { const b = document.createElement('div'); b.className = 'below-stage'; b.innerHTML = typeof S.below === 'function' ? S.below(ctx) : S.below; stageWrap.appendChild(b); }
    }
    if (layout === 'stack') { if (S.proseFirst) { sec.appendChild(prose); if (stageWrap) sec.appendChild(stageWrap); } else { if (stageWrap) sec.appendChild(stageWrap); sec.appendChild(prose); } }
    else { sec.appendChild(prose); if (stageWrap) sec.appendChild(stageWrap); }
    area.appendChild(sec);
    // door state
    sec.querySelectorAll('[data-go]').forEach((a) => {
      const t = (a.getAttribute('data-go') || '').split('/')[0];
      if (t && t !== 'back' && st.visited[t] && st.visited[t].length) a.classList.add('is-visited');
    });
    // mount
    const live = { cleanup: [] };
    App.live = live;
    const api = {
      deck: deck, idx: idx, state: st, root: sec, prose: prose,
      stage: stageWrap ? stageWrap.querySelector('.stage') : null,
      below: stageWrap ? stageWrap.querySelector('.below-stage') : null,
      unlock: function () { st.flags[gateKey(deck, idx)] = true; saveState(); updateNav(); },
      locked: function () { return gateLocked(deck, idx); },
      set: function (k, v) { st.bets[k] = v; saveState(); },
      get: function (k) { return st.bets[k]; },
      flag: function (k, v) { if (v === undefined) return st.flags[k]; st.flags[k] = v; saveState(); },
      goto: function (d, i) { App.go(d, i); },
      onCleanup: function (f) { live.cleanup.push(f); },
      done: !!st.done[deck]
    };
    if (S.mount) { try { S.mount(api); } catch (e) { console.error('mount failed', deck, idx, e); } }
    if (/[?&]autobet=1/.test(location.search)) setTimeout(() => { const c = sec.querySelector('.prose .chip:not([disabled])'); if (c && App.live === live) c.click(); }, 700);
    updateNav();
    window.scrollTo(0, 0);
    document.title = (D.short || D.title) + ' · The Coefficient That Lies';
  }

  function updateNav() {
    const { deck, idx } = App.current, D = App.decks[deck], st = App.state;
    const trunk = App.isTrunk(deck), flat = App.flat();
    const here = flat.findIndex((f) => f.deck === deck && f.idx === idx);
    App.els.pos.textContent = trunk ? ((here + 1) + ' of ' + flat.length + ' · ' + (D.short || D.title)) : ('Side room · ' + (D.short || D.title));
    const dots = App.els.dots; dots.innerHTML = '';
    // on the path the dots are the whole path, so the reader always sees how much is left
    const list = trunk ? flat : D.slides.map((S, i) => ({ deck: deck, idx: i, S: S }));
    list.forEach((f, k) => {
      const b = document.createElement('button');
      const seen = (st.visited[f.deck] || []).indexOf(f.idx) >= 0, cur = f.deck === deck && f.idx === idx;
      b.className = 'dot' + (cur ? ' is-current' : '') + (seen ? ' is-seen' : '') + (trunk && k > 0 && f.idx === 0 ? ' part-start' : '');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Stage ' + (k + 1) + (f.S.title ? ': ' + f.S.title : ''));
      b.title = f.S.title || ('Stage ' + (k + 1));
      const reachable = seen || cur || (trunk ? k <= here : f.idx <= idx) || st.done[f.deck];
      if (!reachable) b.disabled = true;
      b.addEventListener('click', () => App.go(f.deck, f.idx));
      dots.appendChild(b);
    });
    const locked = gateLocked(deck, idx);
    const nb = App.els.next, pb = App.els.prev;
    nb.classList.toggle('is-locked', locked);
    const S = D.slides[idx];
    const last = idx === D.slides.length - 1;
    let label;
    if (locked) label = S.gateHint || 'Try the stage first';
    else if (S.nextLabel) label = S.nextLabel;
    else if (!last) label = 'Next';
    else if (App.isTrunk(deck)) { const k = TRUNK.indexOf(deck); const nd = App.decks[TRUNK[k + 1]]; const nm = nd ? (nd.short || nd.title) : ''; label = (k < TRUNK.length - 1 && nd) ? ('On to ' + nm.charAt(0).toLowerCase() + nm.slice(1)) : (k < TRUNK.length - 1 ? 'Next part' : 'Back to the start'); }
    else label = 'Back to the path';
    nb.innerHTML = '<span>' + label + '</span> &rarr;';
    nb.setAttribute('aria-disabled', locked ? 'true' : 'false');
    pb.disabled = (deck === 'start' && idx === 0);
    // the firm walks the curve in the top bar: overall progress through the trunk; hollow in a side room
    try {
      const pc = document.getElementById('prog-curve');
      if (pc) {
        const path = pc.querySelector('.track'), g = pc.querySelector('g'), trunk = App.isTrunk(deck);
        let f;
        if (trunk) f = (TRUNK.indexOf(deck) + (idx + 1) / D.slides.length) / TRUNK.length;
        else { const p = D.parent, k = Math.max(0, TRUNK.indexOf(p)); const pd = App.decks[p]; f = (k + ((D.parentIdx || 0) + 1) / (pd ? pd.slides.length : 1)) / TRUNK.length; }
        const pt = path.getPointAtLength(Math.max(0, Math.min(1, f)) * path.getTotalLength());
        g.style.transform = 'translate(' + pt.x.toFixed(1) + 'px,' + pt.y.toFixed(1) + 'px)';
        g.firstElementChild.classList.toggle('ghost', !trunk);
      }
    } catch (e) { /* progress curve is decoration */ }
  }

  // ---------- map ----------
  function buildMap() {
    const body = App.els.mapBody; body.innerHTML = '';
    const st = App.state;
    const W = 1040, colW = W / TRUNK.length, topY = 70, sideGap = 112;
    // group side decks by parent
    const sides = {};
    App.order.forEach((id) => { const D = App.decks[id]; if (!App.isTrunk(id)) { (sides[D.parent] = sides[D.parent] || []).push(id); } });
    let maxSide = 0; Object.keys(sides).forEach((k) => { maxSide = Math.max(maxSide, sides[k].length); });
    const H = topY + 70 + maxSide * sideGap + 10;
    const svg = V.el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Map of the explorable' });
    // trunk edges
    for (let k = 0; k < TRUNK.length - 1; k++) {
      const ex1 = colW * (k + .5) + 26, ex2 = colW * (k + 1.5) - 26;
      V.el('path', { d: 'M' + ex1 + ' ' + topY + ' C ' + (ex1 + 34) + ' ' + (topY - 9) + ', ' + (ex2 - 34) + ' ' + (topY + 9) + ', ' + ex2 + ' ' + topY, class: 'map-edge' }, svg);
    }
    function node(id, cx, cy, side) {
      const D = App.decks[id], n = D.slides.length, seen = (st.visited[id] || []).length;
      const g = V.el('g', { class: 'map-node', transform: 'translate(' + cx + ',' + cy + ')', tabindex: '0', role: 'button', 'aria-label': D.title + ', ' + seen + ' of ' + n + ' slides seen' }, svg);
      V.el('circle', { r: 26, class: 'ring' + (side ? ' side' : '') }, g);
      if (seen > 0) {
        const frac = Math.min(1, seen / n), r = 22;
        if (frac >= 0.999) V.el('circle', { r: r, class: 'prog done' }, g);
        else {
          const a = -Math.PI / 2, b = a + 2 * Math.PI * frac;
          const x1 = r * Math.cos(a), y1 = r * Math.sin(a), x2 = r * Math.cos(b), y2 = r * Math.sin(b);
          V.el('path', { d: 'M' + x1 + ' ' + y1 + ' A' + r + ' ' + r + ' 0 ' + (frac > .5 ? 1 : 0) + ' 1 ' + x2 + ' ' + y2, class: 'prog' }, g);
        }
      }
      V.el('circle', { r: 11, class: 'core' + (App.current.deck === id ? ' here' : (seen ? ' seen' : '')) }, g);
      const t = V.el('text', { y: 46 }, g); t.textContent = D.short || D.title;
      const s = V.el('text', { y: 61, class: 'sub' }, g); s.textContent = seen + '/' + n + ' slides';
      const go = () => { App.go(id); closeMap(); };
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      return g;
    }
    TRUNK.forEach((id, k) => {
      if (!App.decks[id]) return;
      const cx = colW * (k + .5);
      node(id, cx, topY, false);
      let prevBottom = topY + 26;
      (sides[id] || []).forEach((sid, j) => {
        const cy = topY + 70 + (j + 1) * sideGap - 30;
        V.el('path', { d: 'M' + cx + ' ' + prevBottom + ' L' + cx + ' ' + (cy - 26), class: 'map-edge side' }, svg);
        node(sid, cx, cy, true);
        prevBottom = cy + 68;
      });
    });
    body.appendChild(svg);
    const leg = document.createElement('div'); leg.className = 'map-legend';
    leg.innerHTML = '<span class="here">you are here</span><span class="seen">visited</span><span>not yet</span><span style="margin-left:auto"></span>';
    const reset = document.createElement('button'); reset.className = 'btn btn-ghost'; reset.type = 'button'; reset.textContent = 'Reset progress';
    reset.addEventListener('click', () => { if (confirm('Forget everything you have visited and start over?')) { App.reset(); closeMap(); } });
    leg.appendChild(reset);
    body.appendChild(leg);
  }
  function openMap() { buildMap(); App.els.map.hidden = false; App.els.mapClose.focus(); }
  function closeMap() { App.els.map.hidden = true; App.els.mapBtn.focus(); }
  App.openMap = openMap; App.closeMap = closeMap;

  // ---------- boot ----------
  App.boot = function () {
    // ?theme=dark|light forces a theme (used for testing; the default follows the viewer's setting)
    const th = /[?&]theme=(dark|light)/.exec(location.search); if (th) document.documentElement.setAttribute('data-theme', th[1]);
    App.state = loadState();
    App.els = {
      area: document.getElementById('stage-area'), dots: document.getElementById('dots'),
      next: document.getElementById('next-btn'), prev: document.getElementById('prev-btn'),
      pos: document.getElementById('deck-pos'), map: document.getElementById('map'),
      mapBody: document.getElementById('map-body'), mapBtn: document.getElementById('map-btn'),
      mapClose: document.getElementById('map-close')
    };
    App.els.next.addEventListener('click', App.next);
    App.els.prev.addEventListener('click', App.prev);
    App.els.mapBtn.addEventListener('click', openMap);
    App.els.mapClose.addEventListener('click', closeMap);
    App.els.map.addEventListener('click', (e) => { if (e.target === App.els.map) closeMap(); });
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-go]');
      if (!a) return;
      e.preventDefault();
      const v = a.getAttribute('data-go');
      if (v === 'back') { App.back(App.current.deck); return; }
      const parts = v.split('/'), d = parts[0], i = parts[1] != null ? parseInt(parts[1], 10) : undefined;
      if (App.decks[d] && !App.isTrunk(d)) { App.state.from[d] = { deck: App.current.deck, idx: App.current.idx }; saveState(); }
      App.go(d, i);
    });
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { App.next(); }
      else if (e.key === 'ArrowLeft') { App.prev(); }
      else if (e.key === 'm' || e.key === 'M') { if (App.els.map.hidden) openMap(); else closeMap(); }
      else if (e.key === 'Escape') { closeMap(); }
    });
    window.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#start/0';
    render();
  };

  // ---------- cached models (computed once per session) ----------
  App.model = function (name, build) {
    if (!App.models[name]) App.models[name] = build();
    return App.models[name];
  };

  // ---------- SVG helpers ----------
  const NS = 'http://www.w3.org/2000/svg';
  const V = {
    el: function (name, attrs, parent) {
      const e = document.createElementNS(NS, name);
      if (attrs) Object.keys(attrs).forEach((k) => { if (attrs[k] != null) e.setAttribute(k, attrs[k]); });
      if (parent) parent.appendChild(e);
      return e;
    },
    svg: function (parent, w, h) {
      w = w || 640; h = h || 400;
      const s = V.el('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'chart', preserveAspectRatio: 'xMidYMid meet' }, parent);
      s.vbW = w; s.vbH = h;
      return s;
    },
    scale: function (d0, d1, r0, r1) {
      const f = (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
      f.inv = (p) => d0 + (p - r0) / (r1 - r0) * (d1 - d0);
      f.d0 = d0; f.d1 = d1; f.r0 = r0; f.r1 = r1;
      return f;
    },
    text: function (parent, x, y, str, cls, attrs) {
      const t = V.el('text', Object.assign({ x: x, y: y, class: cls || '' }, attrs || {}), parent);
      t.textContent = str;
      return t;
    },
    axisX: function (parent, sc, y, o) {
      o = o || {};
      const g = V.el('g', { class: 'axis' }, parent);
      V.el('line', { x1: sc.r0, x2: sc.r1, y1: y, y2: y }, g);
      (o.ticks || []).forEach((t) => {
        const x = sc(t);
        V.el('line', { x1: x, x2: x, y1: y, y2: y + 5 }, g);
        V.text(g, x, y + 18, o.fmt ? o.fmt(t) : String(t), '', { 'text-anchor': 'middle' });
      });
      if (o.label) V.text(g, (sc.r0 + sc.r1) / 2, y + 36, o.label, 'label', { 'text-anchor': 'middle' });
      return g;
    },
    axisY: function (parent, sc, x, o) {
      o = o || {};
      const g = V.el('g', { class: 'axis' }, parent);
      V.el('line', { x1: x, x2: x, y1: sc.r0, y2: sc.r1 }, g);
      (o.ticks || []).forEach((t) => {
        const y = sc(t);
        V.el('line', { x1: x - 5, x2: x, y1: y, y2: y }, g);
        V.text(g, x - 8, y + 4, o.fmt ? o.fmt(t) : String(t), '', { 'text-anchor': 'end' });
      });
      if (o.label) {
        const t = V.text(g, 0, 0, o.label, 'label', { 'text-anchor': 'middle' });
        t.setAttribute('transform', 'translate(' + (x - (o.labelDx || 44)) + ',' + ((sc.r0 + sc.r1) / 2) + ') rotate(-90)');
      }
      return g;
    },
    path: function (pts) {
      let d = '';
      for (let i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + pts[i][0].toFixed(2) + ' ' + pts[i][1].toFixed(2);
      return d;
    },
    // pointer position in viewBox units
    pos: function (svg, ev) {
      const r = svg.getBoundingClientRect();
      const sx = svg.vbW / r.width, sy = svg.vbH / r.height, s = Math.max(sx, sy);
      // preserveAspectRatio meet: letterboxed; compute offset
      const cw = svg.vbW / s, ch = svg.vbH / s;
      const ox = (r.width - cw) / 2, oy = (r.height - ch) / 2;
      return { x: (ev.clientX - r.left - ox) * s, y: (ev.clientY - r.top - oy) * s };
    },
    drag: function (svg, target, onMove, onEnd) {
      let active = false;
      const down = (e) => { active = true; target.setPointerCapture && target.setPointerCapture(e.pointerId); onMove(V.pos(svg, e), e); e.preventDefault(); };
      const move = (e) => { if (!active) return; onMove(V.pos(svg, e), e); };
      const up = (e) => { if (!active) return; active = false; if (onEnd) onEnd(V.pos(svg, e), e); };
      target.addEventListener('pointerdown', down);
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
      return () => { target.removeEventListener('pointerdown', down); target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); };
    },
    tooltip: function (stage) {
      const t = document.createElement('div'); t.className = 'tip'; t.hidden = true; stage.appendChild(t);
      return {
        show: function (clientX, clientY, html) {
          const r = stage.getBoundingClientRect();
          t.innerHTML = html; t.hidden = false;
          const w = t.offsetWidth || 0;
          const x = Math.max(w / 2 + 8, Math.min(r.width - w / 2 - 8, clientX - r.left));
          t.style.left = x + 'px'; t.style.top = (clientY - r.top) + 'px';
        },
        hide: function () { t.hidden = true; }
      };
    },
    fmtPP: function (v, d) { d = d == null ? 1 : d; const s = Math.abs(100 * v).toFixed(d), zero = parseFloat(s) === 0; return (zero ? '' : (v > 0 ? '+' : '−')) + s + ' pp'; },
    fmtSigned: function (v, d) { d = d == null ? 2 : d; const s = Math.abs(v).toFixed(d); return (v < 0 ? '−' : (v > 0 ? '+' : '')) + s; },
    fmtPct: function (v, d) { return (100 * v).toFixed(d == null ? 0 : d) + '%'; },
    fmtP: function (p) { if (p < .001) return 'p < .001'; return 'p = ' + (p < .01 ? p.toFixed(3) : p.toFixed(2)).replace(/^0/, ''); },
    fmtN: function (n) { return n.toLocaleString('en-US'); },
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); }
  };
  App.V = V;

  global.App = App;
  global.V = V;
})(window);
