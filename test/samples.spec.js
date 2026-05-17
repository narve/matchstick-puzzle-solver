import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuleSet } from "../src/match.js";
import { samples } from "../src/samples.js";

function solve(rs, equation) {
  const mutations = rs.mutate(equation.split(""));
  const solutions = mutations
    .filter(rs.evaluate)
    .map(m => m.join("").trim());
  return [...new Set(solutions)];
}

describe("sample puzzles", () => {
  for (const { puzzle, solutions, difficulty, ruleset } of samples) {
    const rs = getRuleSet(ruleset);
    it(`[${ruleset}/${difficulty}] ${puzzle} → ${solutions.join(", ")}`, () => {
      const found = solve(rs, puzzle);
      for (const expected of solutions) {
        assert.ok(
          found.includes(expected),
          `Expected solution "${expected}" not found in [${found.join(", ")}]`
        );
      }
    });
  }
});

describe("sample puzzle distribution", () => {
  for (const rulesetName of ["strict", "default", "flexible"]) {
    for (const difficulty of ["easy", "medium", "hard"]) {
      it(`${rulesetName} has at least 3 ${difficulty} samples`, () => {
        const matching = samples.filter(s => s.ruleset === rulesetName && s.difficulty === difficulty);
        assert.ok(matching.length >= 3,
          `expected ≥3 ${rulesetName}/${difficulty} samples, got ${matching.length}`);
      });
    }
  }
});
