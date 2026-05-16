// Sample matchstick puzzles grouped by difficulty.
//
// Each entry: { puzzle, solutions, difficulty, ruleset }
//
// The `ruleset` field names the most-restrictive ruleset under which the
// puzzle's listed solutions are achievable. The UI shows a sample whenever
// the active ruleset is at least as permissive:
//   - "strict":   pure stick-move rules, no boundary '-' materialisation
//   - "default":  adds the rule that a stick placed in the empty cell on
//                 either side of the puzzle materialises a '-'
//   - "flexible": adds alt-form digits (b, q) and operator alts (M, P, E),
//                 enabling moves like 5↔b, =↔M (visible swap), etc.
//
// Each ruleset has at least 3 samples of each difficulty.

export const samples = [
  // ──────────────────────────────────────────────────────────────────────
  // STRICT — solutions use only the core mutation rules
  // ──────────────────────────────────────────────────────────────────────
  {
    puzzle: "6+4=4",
    solutions: ["0+4=4", "8-4=4"],
    difficulty: "easy",
    ruleset: "strict",
  },
  {
    puzzle: "6-2=7",
    solutions: ["9-2=7", "5+2=7"],
    difficulty: "easy",
    ruleset: "strict",
  },
  {
    puzzle: "8+3-4=0",
    solutions: ["9+3-4=8"],
    difficulty: "easy",
    ruleset: "strict",
  },

  {
    puzzle: "7*5/3=2",
    solutions: ["1*6/3=2"],
    difficulty: "medium",
    ruleset: "strict",
  },
  {
    puzzle: "5/3=1",
    solutions: ["3/3=1", "5/5=1"],
    difficulty: "medium",
    ruleset: "strict",
  },
  {
    puzzle: "1*3=5",
    solutions: ["1*5=5", "1*3=3"],
    difficulty: "medium",
    ruleset: "strict",
  },

  {
    puzzle: "45/9=3",
    solutions: ["45/9=5", "45/5=9"],
    difficulty: "hard",
    ruleset: "strict",
  },
  {
    puzzle: "50-18=38",
    solutions: ["56-18=38"],
    difficulty: "hard",
    ruleset: "strict",
  },
  {
    puzzle: "1+2+3+4+5=6+7+8+9",
    solutions: ["1+2+3+4+6=6-7+8+9", "1+2+3+4+5=6-7+8+8"],
    difficulty: "hard",
    ruleset: "strict",
  },

  // ──────────────────────────────────────────────────────────────────────
  // DEFAULT — solutions require placing a match in the leading/trailing
  // empty cell to form a '-'
  // ──────────────────────────────────────────────────────────────────────
  {
    puzzle: "1+1=8",
    solutions: ["-1+1=0"],
    difficulty: "easy",
    ruleset: "default",
  },
  {
    puzzle: "4+5=7",
    solutions: ["-4+5=1"],
    difficulty: "easy",
    ruleset: "default",
  },
  {
    puzzle: "2+5=9",
    solutions: ["-2+5=3"],
    difficulty: "easy",
    ruleset: "default",
  },

  {
    puzzle: "1+2=7",
    solutions: ["-1+2=1"],
    difficulty: "medium",
    ruleset: "default",
  },
  {
    puzzle: "4+8=2",
    solutions: ["-4+6=2"],
    difficulty: "medium",
    ruleset: "default",
  },
  {
    puzzle: "2+8=4",
    solutions: ["-2+6=4"],
    difficulty: "medium",
    ruleset: "default",
  },

  {
    puzzle: "1+2+9=4",
    solutions: ["-1+2+3=4"],
    difficulty: "hard",
    ruleset: "default",
  },
  {
    puzzle: "1+2+8=7",
    solutions: ["-1+2+6=7"],
    difficulty: "hard",
    ruleset: "default",
  },
  {
    puzzle: "1+3+1=1",
    solutions: ["-1+3-1=1"],
    difficulty: "hard",
    ruleset: "default",
  },

  // ──────────────────────────────────────────────────────────────────────
  // FLEXIBLE — solutions use alt-form digits (b, q) or operator alts (M, E)
  // ──────────────────────────────────────────────────────────────────────
  {
    puzzle: "1+5=5",
    solutions: ["1+5=b"],
    difficulty: "easy",
    ruleset: "flexible",
  },
  {
    puzzle: "2+4=5",
    solutions: ["2+4=b"],
    difficulty: "easy",
    ruleset: "flexible",
  },
  {
    puzzle: "1*9=3",
    solutions: ["1*q=9"],
    difficulty: "easy",
    ruleset: "flexible",
  },

  {
    puzzle: "1*5=6",
    solutions: ["1*b=6", "1*6=b"],
    difficulty: "medium",
    ruleset: "flexible",
  },
  {
    puzzle: "1+2=9",
    solutions: ["7+2=q"],
    difficulty: "medium",
    ruleset: "flexible",
  },
  {
    puzzle: "2-5=3",
    solutions: ["2E5M3"],
    difficulty: "medium",
    ruleset: "flexible",
  },

  {
    puzzle: "1+1+4=5",
    solutions: ["1+1+4=b"],
    difficulty: "hard",
    ruleset: "flexible",
  },
  {
    puzzle: "1+2+6=5",
    solutions: ["1+2+6=q", "1+2+b=9"],
    difficulty: "hard",
    ruleset: "flexible",
  },
  {
    puzzle: "1+3+7=9",
    solutions: ["-1+3+7=q"],
    difficulty: "hard",
    ruleset: "flexible",
  },
];
