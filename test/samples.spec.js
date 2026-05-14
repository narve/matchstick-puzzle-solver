import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuleSets } from "../match.js";
import { samples } from "../samples.js";

const { evaluate, mutate } = getRuleSets().find(r => r.name === "default");

function solve(equation) {
  const mutations = mutate(equation.split(""));
  const solutions = mutations
    .filter(evaluate)
    .map(m => m.join("").trim());
  return [...new Set(solutions)];
}

describe("sample puzzles", () => {
  for (const { puzzle, solutions, difficulty } of samples) {
    it(`[${difficulty}] ${puzzle} → ${solutions.join(", ")}`, () => {
      const found = solve(puzzle);
      for (const expected of solutions) {
        assert.ok(
          found.includes(expected),
          `Expected solution "${expected}" not found in [${found.join(", ")}]`
        );
      }
      assert.ok(
        found.length <= 3,
        `Too many solutions (${found.length}): [${found.join(", ")}]`
      );
    });
  }
});
