# Implementation notes

Reference for the 7-segment matchstick rendering geometry and the
rules-of-the-game audit. See `src/matchstick-svg.js` for the geometry and
`src/match.js` for the rule declarations. `media.html` is a visual
showcase that exercises both.

## Matchstick geometry

The base symbol `#matchstick` has `viewBox="0 0 60 200"`. Inside it:

- **Body** (the wooden stick): `<rect x="23" y="40" width="14" height="155">` —
  spans `(23,40)–(37,195)`, so the body center is at **`(30, 117.5)`** and the
  body bounding box is `30 wide × 195 tall`. Wait, body height is 155, span
  `40–195`. Body center y = (40+195)/2 = 117.5.
- **Head** (the red tip): ellipse `cx=30, cy=33, rx=13, ry=18` — spans
  `y=15–51`. Head sits at the top end of the stick.
- **Full visible stick** spans `y=15–195` in source coords; **full center is
  at `(30, 105)`**.

### Rendering helpers — what their `(x, y)` arguments mean

Straight sticks are described by `metaH(x, y)` / `metaV(x, y)` in
`src/matchstick-svg.js`, which return `{tx, ty, rot, key}` objects.
`segSvg(s)` renders a `<g transform="translate(tx,ty) rotate(rot)
scale(0.2)">`. Diagonals go through `diagSvg({cx, cy, angle})`.

All sticks apply `scale(0.2)`, so the rendered stick is `12 wide × 36 tall`
(body) or roughly `12 × 40` (with head). Length-along-stick after scale: 40.

| Helper | Transform | Body center in user coords | Full center in user coords |
|---|---|---|---|
| `metaV(x, y)` | `translate(x,y) scale(0.2)` | `(x+6, y+23.5)` | `(x+6, y+21)` |
| `metaH(x, y)` | `translate(x, y+6) scale(0.2) rotate(-90)` | `(x+23.5, y)` | `(x+21, y)` |
| `diagSvg({cx,cy,a})` | `translate(cx,cy) rotate(a) translate(-6,-21) scale(0.2)` | rotated body center at `(cx, cy)` | `(cx, cy)` |

Derivation for `metaH`: source body center `(30, 117.5)` → `rotate(-90)` →
`(117.5, -30)` → `scale(0.2)` → `(23.5, -6)` → `translate(x, y+6)` →
`(x+23.5, y)`. The `y+6` in the translate cancels the `-6` from scale, so
the body centerline ends up at user y = `y`.

### Placing operators that share positions

Two facts to remember when aligning operators with the digit middle bar:

1. The digit middle bar uses `metaH(4, 56)` — its body center is at
   `(27.5, 56)`, **not** at viewBox center `(24, 62)`. The middle bar sits
   slightly right-of-center because the matchstick has a heavy head at one
   end.
2. To make `+` cross at the middle bar's center: use `metaH(4, 56)` plus a
   `metaV` whose full-stick center lands at `(27.5, 56)`. That's
   `metaV(21.5, 35)` because `(21.5+6, 35+21) = (27.5, 56)`.
3. To make `×` and `/` intersect at the same point: `{cx: 27.5, cy: 56,
   angle: ±45}` (via `DIAG_SPECS`).
4. For `=` to share a center-line with `×`: two `metaH`s equidistant above
   and below y=56, e.g. `metaH(4, 48)` + `metaH(4, 64)` (16 px apart).

### viewBox-centering trick

Glyph content spans roughly `y=16` to `y=93` in source coords (center
`y=54.5`), and `x=7.4` to `x=44.6` for full-width digits (center `x=26`).
The natural viewBox `0 0 48 124` has center `(24, 62)`, so content sits
upper-left.

Fix: shift the viewBox start to `(2, -7.5)` — i.e.
`viewBox="2 -7.5 48 124"` — in both the `<symbol>` and the display `<svg>`.
This recenters the bulk-content region without moving any segment.

## Rules audit method

Rules are declared in `src/match.js` inside `defineCoreMutations` /
`defineDefaultMutations` and the per-ruleset blocks in `buildRuleSets`,
using two locally-scoped helpers passed to each `defineFn`:

- `add(a, b)`: adding one stick to `a` produces `b`. Implies
  `len(b) == len(a)+1` **and** `segments(a) ⊆ segments(b)`.
- `transform(a, b)`: moving one stick transforms `a` into `b`
  (bidirectional). Implies `len(a) == len(b)` **and**
  `|segments(a) △ segments(b)| == 2`.

### Segment counts (per `CHAR_SEGS`)

| Char | Segments | Count |
|---|---|---|
| `0` | 0,1,2,4,5,6 | 6 |
| `1` | 2,5 | 2 |
| `2` | 0,2,3,4,6 | 5 |
| `3` | 0,2,3,5,6 | 5 |
| `4` | 1,2,3,5 | 4 |
| `5` | 0,1,3,5,6 | 5 |
| `6` | 0,1,3,4,5,6 | 6 |
| `7` | 0,2,5 | 3 |
| `8` | 0,1,2,3,4,5,6 | 7 |
| `9` | 0,1,2,3,5,6 | 6 |
| `-` | 3 | 1 |
| `=` | (rendered specially, but rule-wise 1+1 sticks) | 2 |

### How to check the rules are complete

1. **For each subset+1 pair** (counts differ by 1, smaller ⊂ larger):
   confirm there is an `add()` between them.
2. **For each same-count pair** with symmetric difference of size 2:
   confirm there is a `transform()` between them.
3. Operators only participate where geometrically obvious:
   `-`⊂`+`, `-`⊂`=`, `/`⊂`*`.

This audit caught: invalid `4→9` and ` →1` adds (both needed two sticks);
redundant `6→9` add (same count, should be tfRule only); and missing
`0↔6`, `0↔9` moves.

`4` has no single-stick neighbors in the standard 7-segment alphabet — its
row in the mutations table is correctly empty.
