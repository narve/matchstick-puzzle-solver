// Sample matchstick puzzles grouped by difficulty.
// Each entry: { puzzle, solutions, difficulty }
// Rules follow media.html definitions.

export const samples = [
  // ── Easy: short expressions, straightforward moves ────────────────────
  {
    puzzle: "6+4=4",
    solutions: ["0+4=4", "8-4=4"],
    difficulty: "easy",
  },
  {
    puzzle: "6-2=7",
    solutions: ["9-2=7", "5+2=7"],
    difficulty: "easy",
  },
  {
    puzzle: "8+3-4=0",
    solutions: ["9+3-4=8"],
    difficulty: "easy",
  },

  // ── Medium: multiplication/division, less obvious moves ───────────────
  {
    puzzle: "7*5/3=2",
    solutions: ["1*6/3=2"],
    difficulty: "medium",
  },
  {
    puzzle: "5/3=1",
    solutions: ["3/3=1", "5/5=1"],
    difficulty: "medium",
  },
  {
    puzzle: "1*3=5",
    solutions: ["1*5=5", "1*3=3"],
    difficulty: "medium",
  },
  {
    puzzle: "1+2=7",
    solutions: ["-1+2=1"],
    difficulty: "medium",
  },

  // ── Hard: multi-digit numbers, longer expressions ─────────────────────
  {
    puzzle: "95-68=33",
    solutions: ["99-66=33"],
    difficulty: "hard",
  },
  {
    puzzle: "45/9=3",
    solutions: ["45/9=5", "45/5=9"],
    difficulty: "hard",
  },
  {
    puzzle: "50-18=38",
    solutions: ["56-18=38"],
    difficulty: "hard",
  },
  {
    puzzle: "1+2+3+4+5=6+7+8+9",
    solutions: ["1+2+3+4+6=6-7+8+9", "1+2+3+4+5=6-7+8+8"],
    difficulty: "hard",
  },
];
