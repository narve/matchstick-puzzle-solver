# CLAUDE.md

Reference notes for working on this codebase. Keep concise — defer to JSDoc
in source for the precise contract of each function.

## What this is

Browser-only solver for matchstick puzzles: enter an equation, see whether
it's true; if not, single-stick-move solutions are shown; if true, possible
quiz tasks (broken versions) are listed. Vanilla JS modules + SVG, no
framework, no build step.

## Key files

All JS lives under `src/`. HTML and tests stay at the repo root.

- `src/match.js` — pure rules engine, no DOM. `getRuleSets()` returns the
  three rulesets (`strict`, `default`, `flexible`); also exports
  `canonicalise`, `RULESET_PERMISSIVENESS`, `isSampleVisible`,
  `ALT_TO_CANONICAL`.
- `src/render.js` — page-agnostic HTML helpers used by every page:
  `renderSolutionsBlock`, `renderRulesTable`, `renderRadioGroup`,
  `renderDescription`, `makeEquationLi`, `titleCase`. Takes a container
  element + data; no global state.
- `src/index-page.js` — `setup()` for `index.html`. Owns the live-solver
  state (`active` ruleset, `activeDifficulty`), the `localStorage` glue,
  and all `#equation` / `#samples` / `#difficulty-filter` / `#ruleset-*`
  wiring.
- `src/puzzle-page.js` — entry for `puzzle.html`. Reads `puzzle` /
  `ruleset` / `puzzle-set` URL params, renders the big preview, wires the
  Reveal toggle / animation, and the prev/next journey nav.
- `src/puzzle-url.js` — single `puzzleHref({puzzle, ruleset?, setId?})`
  helper used by both pages so URL format stays in one place.
- `src/puzzle-sets.js` — named puzzle sets (currently `n1`) used by
  `puzzle.html`'s journey mode.
- `src/matchstick-svg.js` — SVG rendering of every character.
  `injectDefs()` registers a `<symbol>` per legal char (union across
  rulesets) inside a hidden `<svg id="char-defs">`. `charSvg(c, w, h)`
  and `equationSvg(text, h)` produce `<svg><use href="#c-…">` strings.
  `equationAnimatableSvg` / `charSegments` expose per-stick metadata for
  animation.
- `src/animate.js` — `findFirstSolution`, `animateSolve` (lift → travel →
  place), and `wireSolveButton`. Used by `puzzle.html` and `media.html`.
- `src/samples.js` — sample puzzles tagged by ruleset and difficulty.
- `index.html` / `puzzle.html` / `media.html` — page shells. Shared
  styles in `styles.css` (CSS vars + `.chip` / `.chip-soft` classes);
  page-specific tweaks stay inline.
- `test/*.spec.js` — `node --test` unit specs.
- `e2e/*.spec.js` — Playwright (Edge channel) UI specs.

## Ruleset model

Each ruleset has `{ name, description, legals, adds, subs, trans, evaluate,
mutate }` (see the JSDoc typedef in `src/match.js`). Three rulesets ship today,
in increasing permissiveness:

- **strict** — classic rules + a strict evaluator that rejects expressions
  starting or ending with an operator.
- **default** — strict + `add(' ', '-')` (a match dropped into the boundary
  space materialises a `-`); lenient JS-style evaluation.
- **flexible** — default minus the canonical `add('-', '=')` plus alt-form
  rules (see next section).

`RULESET_PERMISSIVENESS = ["strict", "default", "flexible"]` is the canonical
order. Sample visibility: a sample tagged with X is visible whenever
`index(active) ≥ index(X)`.

When adding a ruleset:
1. Append it to `getRuleSets()` with a description + define function.
2. If it introduces new characters, pass them as `extraLegals`.
3. Extend `ALT_TO_CANONICAL` if any new alt-form chars are introduced.
4. Add to `RULESET_PERMISSIVENESS` in the right slot.

## Alt-form characters

Internal-only single-letter codes that render at non-canonical stick
positions but evaluate as their canonical counterpart:

| Code | Reads as | Visual                                  |
|------|----------|-----------------------------------------|
| `b`  | `6`      | 5-segment 6 (no top horizontal)         |
| `q`  | `9`      | 5-segment 9 (no bottom horizontal)      |
| `M`  | `-`      | `-` stroke at canonical `=` bottom y    |
| `P`  | `+`      | `+` cross at canonical `=` top y        |
| `E`  | `=`      | `=` with bottom at canonical `-` y      |

Used only by the **flexible** ruleset. The `ALT_TO_CANONICAL` map drives:
- `defaultEvaluate` in `src/match.js` (canonicalises before `eval`)
- input normalisation in `putSample` (`src/index-page.js`) so `<input>`
  shows canonical text even when the clicked solution had alt chars
- `renderRulesTable` in `src/render.js` skips alt-character rows because
  every rule involving an alt form is already present in the canonical row

Inputs and sample puzzles never contain alt chars; they only arise as
mutation outputs.

## Tests

- `npm test` — unit tests (`node --test test/*.spec.js`)
- `npm run test:e2e` — Playwright on MS Edge (`channel: 'msedge'`)
- `npm run test:all` — both, sequentially

The Playwright `webServer` config runs `python3 -m http.server 8766`. Do
NOT use live-server here: it watches the working directory and reloads the
page whenever Playwright writes to `playwright-report/`, which kills the
input mid-test.

For local development, `npm run watch` (live-server on :8765) is fine
because no test artefacts are being written.

`auto-screenshots/` is git-ignored — drop any one-off screenshots there.

## Conventions

- No build step. ES modules served directly via `<script type="module">`.
- All comments and identifiers in English.
- Don't render alt-form characters via `<input>` (it's plain text); use
  the `#preview` SVG area or solution lists, both of which go through
  `equationSvg`.
