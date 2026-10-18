/* engine.js — the paper's data-generating process and estimators, in the browser.
   Mirrors simulations/R/dgp.R and truth.R: standardised (optionally skewed)
   interacted variables, controls w1 (skew 2, coef .30) and w2 (Bernoulli .3,
   coef .20), probit/logit link, b0 solved for a base rate, b3 solvable for the
   probability null or a power target. Population quantities are Monte Carlo
   integrals over one fixed population; sample fits are maximum likelihood. */
(function (global) {
  'use strict';

  // ---------- random numbers (seeded, reproducible) ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normalFrom(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------- links ----------
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 +
      t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 +
      t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const SQRT2PI = Math.sqrt(2 * Math.PI);
  const probit = {
    name: 'probit',
    G: (e) => 0.5 * erfc(-e / Math.SQRT2),
    g: (e) => Math.exp(-0.5 * e * e) / SQRT2PI,
    gp: (e) => -e * Math.exp(-0.5 * e * e) / SQRT2PI
  };
  const logit = {
    name: 'logit',
    G: (e) => 1 / (1 + Math.exp(-e)),
    g: (e) => { const p = 1 / (1 + Math.exp(-e)); return p * (1 - p); },
    gp: (e) => { const p = 1 / (1 + Math.exp(-e)); return p * (1 - p) * (1 - 2 * p); }
  };
  function link(name) { return name === 'logit' ? logit : probit; }

  // ---------- skewed standardised covariate (shifted lognormal, as dgp.R) ----------
  function lnormSigmaForSkew(skew) {
    if (skew <= 0) return 0;
    let lo = 1e-4, hi = 2.5;
    const f = (s) => { const es = Math.exp(s * s); return (es + 2) * Math.sqrt(es - 1) - skew; };
    for (let i = 0; i < 80; i++) {
      const mid = 0.5 * (lo + hi);
      if (f(mid) > 0) hi = mid; else lo = mid;
    }
    return 0.5 * (lo + hi);
  }
  function drawCont(rng, n, skew) {
    const out = new Float64Array(n);
    if (!skew || skew <= 0) {
      for (let i = 0; i < n; i++) out[i] = normalFrom(rng);
      return out;
    }
    const s = lnormSigmaForSkew(skew);
    const mean = Math.exp(s * s / 2), sd = Math.sqrt((Math.exp(s * s) - 1) * Math.exp(s * s));
    for (let i = 0; i < n; i++) out[i] = (Math.exp(s * normalFrom(rng)) - mean) / sd;
    return out;
  }
  function drawBin(rng, n, p) {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = rng() < p ? 1 : 0;
    return out;
  }

  // ---------- population ----------
  // spec: {intType:'cxc'|'bxc'|'bxb', skewX, skewZ, px, pz, link:'probit'|'logit', base}
  function makePop(spec, N, seed) {
    const rng = mulberry32(seed || 88);
    const pop = { N: N, spec: spec };
    pop.w1 = drawCont(rng, N, 2);
    pop.w2 = drawBin(rng, N, 0.3);
    const it = spec.intType || 'cxc';
    if (it === 'cxc') { pop.x = drawCont(rng, N, spec.skewX || 0); pop.z = drawCont(rng, N, spec.skewZ || 0); }
    else if (it === 'bxc') { pop.x = drawBin(rng, N, spec.px == null ? 0.5 : spec.px); pop.z = drawCont(rng, N, spec.skewZ || 0); }
    else { pop.x = drawBin(rng, N, spec.px == null ? 0.5 : spec.px); pop.z = drawBin(rng, N, spec.pz == null ? 0.5 : spec.pz); }
    pop.binX = it !== 'cxc';
    pop.binZ = it === 'bxb';
    return pop;
  }

  function defaultBeta() { return { b0: 0, bx: 0.35, bz: 0.35, b3: 0, gw1: 0.30, gw2: 0.20 }; }

  // index for unit i at (possibly counterfactual) x, z
  function eta(pop, beta, i, xv, zv) {
    return beta.b0 + beta.bx * xv + beta.bz * zv + beta.b3 * xv * zv + beta.gw1 * pop.w1[i] + beta.gw2 * pop.w2[i];
  }

  function baseRate(pop, beta, L) {
    let s = 0;
    for (let i = 0; i < pop.N; i++) s += L.G(eta(pop, beta, i, pop.x[i], pop.z[i]));
    return s / pop.N;
  }

  function solveB0(pop, beta, L, target) {
    let lo = -10, hi = 10;
    const b = Object.assign({}, beta);
    for (let k = 0; k < 42; k++) {
      b.b0 = 0.5 * (lo + hi);
      if (baseRate(pop, b, L) > target) hi = b.b0; else lo = b.b0;
    }
    b.b0 = 0.5 * (lo + hi);
    return b;
  }

  // unit-change (or 0->1) double difference for unit i
  function ieDD(pop, beta, L, i, dx, dz) {
    const x0 = pop.x[i], z0 = pop.z[i];
    let xa, xb, za, zb;
    if (pop.binX) { xa = 0; xb = 1; } else { xa = x0; xb = x0 + (dx == null ? 1 : dx); }
    if (pop.binZ) { za = 0; zb = 1; } else { za = z0; zb = z0 + (dz == null ? 1 : dz); }
    return L.G(eta(pop, beta, i, xb, zb)) - L.G(eta(pop, beta, i, xb, za))
         - L.G(eta(pop, beta, i, xa, zb)) + L.G(eta(pop, beta, i, xa, za));
  }
  function ieVector(pop, beta, L, dx, dz) {
    const v = new Float64Array(pop.N);
    for (let i = 0; i < pop.N; i++) v[i] = ieDD(pop, beta, L, i, dx, dz);
    return v;
  }
  function aieDD(pop, beta, L, dx, dz) {
    let s = 0;
    for (let i = 0; i < pop.N; i++) s += ieDD(pop, beta, L, i, dx, dz);
    return s / pop.N;
  }
  // average cross-partial (the dydxs route)
  function ieCP(pop, beta, L, i) {
    const x = pop.x[i], z = pop.z[i], e = eta(pop, beta, i, x, z);
    return beta.b3 * L.g(e) + (beta.bx + beta.b3 * z) * (beta.bz + beta.b3 * x) * L.gp(e);
  }
  function aieCP(pop, beta, L) {
    let s = 0;
    for (let i = 0; i < pop.N; i++) s += ieCP(pop, beta, L, i);
    return s / pop.N;
  }

  // probability null: b3 such that AIE (unit-change) = 0, b0 re-solved for the base rate
  function solveB3(pop, beta, L, base, target) {
    target = target || 0;
    let lo = -4, hi = 4;
    const f = (b3) => { const b = solveB0(pop, Object.assign({}, beta, { b3: b3 }), L, base); return aieDD(pop, b, L) - target; };
    let flo = f(lo), fhi = f(hi);
    if (flo * fhi > 0) { // widen once
      lo = -8; hi = 8; flo = f(lo); fhi = f(hi);
    }
    for (let k = 0; k < 28; k++) {
      const mid = 0.5 * (lo + hi), fm = f(mid);
      if ((fm > 0) === (fhi > 0)) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    const b3 = 0.5 * (lo + hi);
    return solveB0(pop, Object.assign({}, beta, { b3: b3 }), L, base);
  }

  // average predicted probability at fixed x and z (controls at observed values)
  function meanP(pop, beta, L, xv, zv, stride) {
    stride = stride || 1;
    let s = 0, c = 0;
    for (let i = 0; i < pop.N; i += stride) { s += L.G(eta(pop, beta, i, xv, zv)); c++; }
    return s / c;
  }
  function twoLine(pop, beta, L, zv, xs, stride) {
    return xs.map((xv) => meanP(pop, beta, L, xv, zv, stride || 4));
  }
  // pointwise interaction effect at x = xv, z at observed values
  function pointwiseIE(pop, beta, L, xv, stride) {
    stride = stride || 4;
    let s = 0, c = 0;
    for (let i = 0; i < pop.N; i += stride) {
      const z0 = pop.z[i];
      s += L.G(eta(pop, beta, i, xv + 1, z0 + 1)) - L.G(eta(pop, beta, i, xv + 1, z0))
         - L.G(eta(pop, beta, i, xv, z0 + 1)) + L.G(eta(pop, beta, i, xv, z0));
      c++;
    }
    return s / c;
  }
  // average marginal effect of a unit change in x, with z fixed at zv (as the fig4 script)
  function ameAtZ(pop, beta, L, zv, stride) {
    stride = stride || 4;
    let s = 0, c = 0;
    for (let i = 0; i < pop.N; i += stride) {
      const x0 = pop.x[i];
      s += L.G(eta(pop, beta, i, x0 + 1, zv)) - L.G(eta(pop, beta, i, x0, zv));
      c++;
    }
    return s / c;
  }

  // ---------- linear algebra ----------
  function solveSym(A, b) { // Gaussian elimination with partial pivoting; A: array of rows
    const n = b.length, M = A.map((r, i) => r.slice().concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      const tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      const piv = M[c][c];
      if (Math.abs(piv) < 1e-300) return null;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / piv;
        if (f === 0) continue;
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  function invert(A) {
    const n = A.length, cols = [];
    for (let j = 0; j < n; j++) {
      const e = new Array(n).fill(0); e[j] = 1;
      const s = solveSym(A, e);
      if (!s) return null;
      cols.push(s);
    }
    const inv = [];
    for (let i = 0; i < n; i++) { inv.push([]); for (let j = 0; j < n; j++) inv[i].push(cols[j][i]); }
    return inv;
  }

  // design row: [1, x, z, xz, w1, w2]
  function rowOf(d, i, xv, zv) {
    const x = xv == null ? d.x[i] : xv, z = zv == null ? d.z[i] : zv;
    return [1, x, z, x * z, d.w1[i], d.w2[i]];
  }

  // OLS of a response vector on the design; returns coefficients and HC1 SEs
  function ols(d, y) {
    const n = d.N, p = 6, XtX = [], Xty = new Array(p).fill(0);
    for (let i = 0; i < p; i++) XtX.push(new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const r = rowOf(d, i);
      for (let a = 0; a < p; a++) { Xty[a] += r[a] * y[i]; for (let b = a; b < p; b++) XtX[a][b] += r[a] * r[b]; }
    }
    for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
    const beta = solveSym(XtX, Xty);
    if (!beta) return null;
    const inv = invert(XtX);
    // HC1 sandwich
    const meat = []; for (let i = 0; i < p; i++) meat.push(new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const r = rowOf(d, i);
      let fit = 0; for (let a = 0; a < p; a++) fit += r[a] * beta[a];
      const e2 = (y[i] - fit) * (y[i] - fit);
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) meat[a][b] += e2 * r[a] * r[b];
    }
    const V = [];
    for (let a = 0; a < p; a++) { V.push([]); for (let b = 0; b < p; b++) {
      let s = 0; for (let k = 0; k < p; k++) for (let l = 0; l < p; l++) s += inv[a][k] * meat[k][l] * inv[l][b];
      V[a].push(s * n / (n - p));
    } }
    return { beta: beta, vcov: V, se: beta.map((_, a) => Math.sqrt(Math.max(V[a][a], 0))) };
  }

  // population limit of the LPM's product coefficient: OLS of P(y=1) on the regressors
  function lpmPlim(pop, beta, L) {
    const P = new Float64Array(pop.N);
    for (let i = 0; i < pop.N; i++) P[i] = L.G(eta(pop, beta, i, pop.x[i], pop.z[i]));
    const fit = ols(pop, P);
    return fit ? fit.beta[3] : NaN;
  }

  // ---------- sampling and ML fitting ----------
  function drawSample(spec, n, beta, L, seed) {
    const d = makePop(spec, n, seed);
    d.y = new Float64Array(n);
    const rng = mulberry32((seed || 1) * 7919 + 13);
    for (let i = 0; i < n; i++) d.y[i] = rng() < L.G(eta(d, beta, i, d.x[i], d.z[i])) ? 1 : 0;
    return d;
  }

  // Newton-Raphson for probit/logit; returns {beta, vcov, se, converged}
  function fitBinary(d, L) {
    const n = d.N, p = 6;
    let b = new Array(p).fill(0);
    // start from OLS/2.5 for stability
    const o = ols(d, d.y);
    if (o) b = o.beta.map((v) => v * 2.5);
    b[0] = b[0] - 1.25 * (o ? o.beta[0] : 0) - 0; // rough centring
    if (o) { // better start: map mean to link
      const ybar = Math.max(1e-3, Math.min(1 - 1e-3, Array.from(d.y).reduce((s, v) => s + v, 0) / n));
      b = o.beta.map((v) => v * (L.name === 'logit' ? 4 : 2.5));
      b[0] = (L.name === 'logit' ? Math.log(ybar / (1 - ybar)) : qnorm(ybar));
    }
    let converged = false, ll = -Infinity;
    for (let it = 0; it < 60; it++) {
      const grad = new Array(p).fill(0), H = [];
      for (let i = 0; i < p; i++) H.push(new Array(p).fill(0));
      let llNew = 0;
      for (let i = 0; i < n; i++) {
        const r = rowOf(d, i);
        let e = 0; for (let a = 0; a < p; a++) e += r[a] * b[a];
        const y = d.y[i];
        let w1, w2; // gradient weight and (negative) hessian weight
        if (L.name === 'logit') {
          const pr = 1 / (1 + Math.exp(-e));
          llNew += y ? Math.log(Math.max(pr, 1e-300)) : Math.log(Math.max(1 - pr, 1e-300));
          w1 = y - pr; w2 = pr * (1 - pr);
        } else {
          const q = y ? 1 : -1, qe = q * e;
          const Phi = Math.max(probit.G(qe), 1e-300), phi = probit.g(qe);
          llNew += Math.log(Phi);
          const lam = q * phi / Phi;
          w1 = lam; w2 = lam * (lam + e);
        }
        for (let a = 0; a < p; a++) { grad[a] += w1 * r[a]; for (let c = a; c < p; c++) H[a][c] += w2 * r[a] * r[c]; }
      }
      for (let a = 0; a < p; a++) for (let c = 0; c < a; c++) H[a][c] = H[c][a];
      const step = solveSym(H, grad);
      if (!step) break;
      let maxStep = 0;
      for (let a = 0; a < p; a++) { b[a] += step[a]; maxStep = Math.max(maxStep, Math.abs(step[a])); }
      if (Math.abs(llNew - ll) < 1e-9 && maxStep < 1e-7) { converged = true; ll = llNew; break; }
      ll = llNew;
      if (maxStep < 1e-8) { converged = true; break; }
    }
    // final Hessian at b
    const H = []; for (let i = 0; i < p; i++) H.push(new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const r = rowOf(d, i);
      let e = 0; for (let a = 0; a < p; a++) e += r[a] * b[a];
      let w2;
      if (L.name === 'logit') { const pr = 1 / (1 + Math.exp(-e)); w2 = pr * (1 - pr); }
      else { const q = d.y[i] ? 1 : -1, qe = q * e; const Phi = Math.max(probit.G(qe), 1e-300); const lam = q * probit.g(qe) / Phi; w2 = lam * (lam + e); }
      for (let a = 0; a < p; a++) for (let c = a; c < p; c++) H[a][c] += w2 * r[a] * r[c];
    }
    for (let a = 0; a < p; a++) for (let c = 0; c < a; c++) H[a][c] = H[c][a];
    const V = invert(H);
    return { beta: b, vcov: V, se: V ? b.map((_, a) => Math.sqrt(Math.max(V[a][a], 0))) : null, converged: converged, loglik: ll };
  }

  function qnorm(p) { // Acklam's approximation, adequate for starting values
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const plow = 0.02425, phigh = 1 - plow;
    let q, r;
    if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= phigh) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // AIE (unit-change double difference) from a fitted coefficient vector on sample d
  function aieFromBeta(d, bvec, L, dx, dz) {
    const beta = { b0: bvec[0], bx: bvec[1], bz: bvec[2], b3: bvec[3], gw1: bvec[4], gw2: bvec[5] };
    return aieDD(d, beta, L, dx, dz);
  }
  function aieDelta(d, fit, L, dx, dz) {
    const est = aieFromBeta(d, fit.beta, L, dx, dz);
    if (!fit.vcov) return { aie: est, se: NaN, lo: NaN, hi: NaN, p: NaN };
    const p = 6, grad = [];
    for (let a = 0; a < p; a++) {
      const h = 1e-5 * Math.max(1, Math.abs(fit.beta[a]));
      const bp = fit.beta.slice(), bm = fit.beta.slice();
      bp[a] += h; bm[a] -= h;
      grad.push((aieFromBeta(d, bp, L, dx, dz) - aieFromBeta(d, bm, L, dx, dz)) / (2 * h));
    }
    let v = 0;
    for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) v += grad[a] * fit.vcov[a][c] * grad[c];
    const se = Math.sqrt(Math.max(v, 0)), zst = se > 0 ? est / se : 0;
    return { aie: est, se: se, lo: est - 1.96 * se, hi: est + 1.96 * se, p: 2 * probit.G(-Math.abs(zst)) };
  }
  // AME of x at z fixed, from a fitted vector, with delta SE (used for selected-values contrasts)
  function ameFromBeta(d, bvec, L, zv) {
    const beta = { b0: bvec[0], bx: bvec[1], bz: bvec[2], b3: bvec[3], gw1: bvec[4], gw2: bvec[5] };
    let s = 0;
    for (let i = 0; i < d.N; i++) s += L.G(eta(d, beta, i, d.x[i] + 1, zv)) - L.G(eta(d, beta, i, d.x[i], zv));
    return s / d.N;
  }
  function contrastDelta(d, fit, L, z1, z2) {
    const f = (bv) => ameFromBeta(d, bv, L, z2) - ameFromBeta(d, bv, L, z1);
    const est = f(fit.beta), p = 6, grad = [];
    for (let a = 0; a < p; a++) {
      const h = 1e-5 * Math.max(1, Math.abs(fit.beta[a]));
      const bp = fit.beta.slice(), bm = fit.beta.slice(); bp[a] += h; bm[a] -= h;
      grad.push((f(bp) - f(bm)) / (2 * h));
    }
    let v = 0;
    for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) v += grad[a] * fit.vcov[a][c] * grad[c];
    const se = Math.sqrt(Math.max(v, 0)), zst = se > 0 ? est / se : 0;
    return { est: est, se: se, p: 2 * probit.G(-Math.abs(zst)) };
  }
  function ameCurve(d, fit, L, zs) {
    return zs.map((zv) => {
      const f = (bv) => ameFromBeta(d, bv, L, zv);
      const est = f(fit.beta), grad = [];
      for (let a = 0; a < 6; a++) {
        const h = 1e-5 * Math.max(1, Math.abs(fit.beta[a]));
        const bp = fit.beta.slice(), bm = fit.beta.slice(); bp[a] += h; bm[a] -= h;
        grad.push((f(bp) - f(bm)) / (2 * h));
      }
      let v = 0;
      for (let a = 0; a < 6; a++) for (let c = 0; c < 6; c++) v += grad[a] * fit.vcov[a][c] * grad[c];
      const se = Math.sqrt(Math.max(v, 0));
      return { z: zv, ame: est, lo: est - 1.96 * se, hi: est + 1.96 * se };
    });
  }
  // the divergence heuristic on the fitted two-line plot over mean +- 1 SD
  function plotHeuristic(d, fit, L, tau) {
    const beta = { b0: fit.beta[0], bx: fit.beta[1], bz: fit.beta[2], b3: fit.beta[3], gw1: fit.beta[4], gw2: fit.beta[5] };
    const gap = (xv) => meanP(d, beta, L, xv, 1, 2) - meanP(d, beta, L, xv, -1, 2);
    const change = gap(1) - gap(-1);
    return { change: change, declares: Math.abs(change) > (tau == null ? 0.01 : tau) };
  }
  function pValue(z) { return 2 * probit.G(-Math.abs(z)); }

  global.Engine = {
    mulberry32, normalFrom, probit, logit, link, lnormSigmaForSkew, drawCont, drawBin,
    makePop, defaultBeta, eta, baseRate, solveB0, ieDD, ieVector, aieDD, ieCP, aieCP, solveB3,
    meanP, twoLine, pointwiseIE, ameAtZ, ols, lpmPlim, drawSample, fitBinary, aieDelta,
    contrastDelta, ameCurve, plotHeuristic, pValue, qnorm, solveSym, invert
  };
})(typeof window !== 'undefined' ? window : globalThis);
