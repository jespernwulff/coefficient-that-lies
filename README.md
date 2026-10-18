# The Coefficient That Lies

An explorable explanation of interaction effects in logit, probit and other nonlinear models.

**Open it: https://jespernwulff.github.io/coefficient-that-lies/**

A firm invests in a new market, and it succeeds or it fails. Does experience make the
investment pay off more? In twelve short steps (about nine minutes) you stand on the curve,
watch the product-term coefficient give the wrong answer in both directions, see a
predicted-probability plot change its verdict when the window moves, and meet the quantity
that answers the hypothesis: the average interaction effect, one line after the model.
Optional side rooms go deeper (the formula, other remedies, ordered and multinomial
outcomes, all 174 simulated designs, panels and fixed effects, the three published cases,
and a sandbox).

Built on

> Wulff, J. N. (2026). *From improvised to standardized: testing interaction effects in
> logit, probit, and other nonlinear models.*

Every simulation number comes from the paper's own runs, and every playable runs the
paper's data-generating process in your browser. The average interaction effect is
computed in Stata with `ginteff` (Radean, 2023, *Stata Journal*) and in R with the
[ginteff R package](https://github.com/jespernwulff/ginteff).

## Run it locally

The site is plain HTML, CSS and JavaScript with no build step.

```bash
python -m http.server 8000
```

Then open http://localhost:8000/ .

## Files

| file | role |
|---|---|
| `index.html` | the shell: top bar, stage, navigation, map |
| `styles.css` | light and dark themes, layout, chart styles |
| `app.js` | navigation, progress (saved in the browser), map, SVG helpers |
| `engine.js` | the paper's data-generating process and estimators in JavaScript |
| `data.js` | the paper's simulation summaries and observation-level effects |
| `decks.js`, `decks2.js`, `decks_side.js` | the steps and side rooms |
