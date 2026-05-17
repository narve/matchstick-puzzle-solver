# matchstick-puzzle-solver

A browser tool for matchstick equation puzzles: type or click an equation,
see whether it's true, and if not get every single-stick-move solution.

Live at <https://sticks.dv8.no> / <https://narve.github.io/matchstick-puzzle-solver/>.

## Features

- **Three rulesets**, picked from a radio button:
  - **Strict** — classic puzzle rules. One match moves; the result must be
    a well-formed equation. Expressions like `+2+2=4` are rejected.
  - **Default** — adds the rule that a match can be placed in the empty
    cell on either side of the puzzle, materialising a leading `-`.
    Example: `1+2=7 → -1+2=1`.
  - **Flexible** — adds two more relaxations:
    - `6` and `9` can each be drawn with one fewer stick (rendered as
      visibly distinct 5-segment alt forms).
    - `-`, `+`, `=` have slightly-misaligned alternate forms, shown when
      a match has moved into or out of them. So the swap solution to
      `2-5=3` renders with both `=` and `-` in non-canonical positions.
- Every character — digits, operators, alt forms — is drawn as a real
  matchstick SVG (with wood grain and a red phosphorus head, no special
  font needed).
- The rules table is generated dynamically from the active ruleset, so
  switching rulesets immediately shows which moves are legal.
- ~30 sample puzzles tagged by difficulty (easy / medium / hard) and by
  the most-restrictive ruleset under which they solve, displayed six
  per difficulty.
- **Standalone puzzle page** (`puzzle.html?puzzle=…`) for sharing a single
  puzzle, with an animated reveal of the solution. Supports a
  **journey mode** (`?puzzle-set=n1`) that walks through a curated set
  with prev/next navigation.

## Development

```sh
npm install            # install Playwright (the only dependency)
npm run watch          # live-server on :8765 with auto-reload
npm test               # node --test unit specs
npm run test:e2e       # Playwright (MS Edge) e2e specs
npm run test:all       # both, sequentially
```

No build step — the page is plain ES modules served from disk.

See `CLAUDE.md` for architecture notes (ruleset model, alt-form characters,
test setup).

## Feedback

Issues and PRs welcome on
<https://github.com/narve/matchstick-puzzle-solver>.
