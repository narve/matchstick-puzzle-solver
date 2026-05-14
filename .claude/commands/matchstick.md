# Matchstick SVG skill

Use this skill when asked to add, modify, or render matchstick SVG elements in this project.

## Symbol definition

The reusable matchstick is defined as `<symbol id="matchstick" viewBox="0 0 60 200">` inside a hidden `<svg style="display:none">`. **All `<defs>` (gradients, filters) must live inside the `<symbol>`, not outside it** — this is required for Firefox, which resolves `url()` paint-server references within the `<use>` shadow tree rather than the host document.

## Rendering a matchstick

Reference the symbol from any SVG with `<use href="#matchstick"/>`. Control display size via the outer `<svg width height>` or a `<g transform="scale(…)">`.

### Transforms for segments

In a coordinate space where one matchstick renders 12 × 40 px (symbol scaled by 0.2):

**Vertical segment at (x, y):**
```svg
<g transform="translate(x,y) scale(0.2)"><use href="#matchstick"/></g>
```
Occupies x … x+12, y … y+40.

**Horizontal segment at (x, y)** (head on left):
```svg
<g transform="translate(x,y+12) scale(0.2) rotate(90)"><use href="#matchstick"/></g>
```
Occupies x … x+40, y … y+12.

**Diagonal '/' at centre (cx, cy):**
```svg
<g transform="translate(cx,cy) rotate(-55) translate(-6,-20) scale(0.2)"><use href="#matchstick"/></g>
```

**Diagonal '\' at centre (cx, cy):**
```svg
<g transform="translate(cx,cy) rotate(55) translate(-6,-20) scale(0.2)"><use href="#matchstick"/></g>
```

## 7-segment display layout

Canvas: `viewBox="0 0 48 124"` (4 px padding on all sides).

| Index | Segment    | Type | x  | y   |
|-------|------------|------|----|-----|
| 0     | Top        | H    | 4  | 4   |
| 1     | Top-left   | V    | 4  | 16  |
| 2     | Top-right  | V    | 32 | 16  |
| 3     | Middle     | H    | 4  | 56  |
| 4     | Bot-left   | V    | 4  | 68  |
| 5     | Bot-right  | V    | 32 | 68  |
| 6     | Bottom     | H    | 4  | 108 |

### Digit encoding (active segment indices)

| Char | Segments          | Count |
|------|-------------------|-------|
| 0    | 0,1,2,4,5,6       | 6     |
| 1    | 2,5               | 2     |
| 2    | 0,2,3,4,6         | 5     |
| 3    | 0,2,3,5,6         | 5     |
| 4    | 1,2,3,5           | 4     |
| 5    | 0,1,3,5,6         | 5     |
| 6    | 0,1,3,4,5,6       | 6     |
| 7    | 0,2,5             | 3     |
| 8    | 0,1,2,3,4,5,6     | 7     |
| 9    | 0,1,2,3,5,6       | 6     |
| -    | 3                 | 1     |
| =    | 3,6               | 2     |
| +    | hSeg(4,56) + vSeg(18,16) + vSeg(18,56) | 3 |
| /    | diagonal rotate(-55) centred at (24,62) | 1 |
| *    | '/' + '\' crossing at (24,62) | 2 |
| (sp) | (none)            | 0     |

## Mutation rules (from match.js)

Adding one match: `-→+`, `-→=`, `0→8`, `1→7`, `3→9`, `4→9`, `5→9`, `5→6`, `6→8`, `6→9`, `9→8`, ` →1`

Moving one match (bidirectional): `3↔5`, `3↔2`, `6↔9`
