// These tests document mutations that are currently considered valid but
// shouldn't be. They stem from the `add(' ', '1')` rule in match.js, which
// treats a digit `1` as costing a single matchstick (it actually uses two —
// segments 2 and 5). Removing that rule should make every assertion pass.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuleSets } from "../src/match.js";

const { evaluate, mutate } = getRuleSets().find(r => r.name === "default");

function solutions(equation) {
  return [...new Set(
    mutate(equation.split(""))
      .filter(evaluate)
      .map(m => m.join("").trim())
  )];
}

describe("space ↔ 1 rule should not exist", () => {
  it("'1+2+3+4+5=10+10' has no single-move solution (currently finds '+2+9+4+5=10+10' by deleting the 1)", () => {
    assert.deepStrictEqual(solutions("1+2+3+4+5=10+10"), []);
  });

  it("no solution should start with an orphan operator across a range of inputs", () => {
    const probes = [
      "1+2+3+4+5=10+10",
      "1+2=4",
      "1+1=3",
      "1-1=2",
      "11+1=13",
    ];
    for (const eq of probes) {
      for (const s of solutions(eq)) {
        assert.ok(
          !/^[+\-*/=]/.test(s),
          `Solution '${s}' for '${eq}' starts with an operator — a 1 was deleted from the front`
        );
      }
    }
  });
});
