import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuleSet } from "../match.js";

const strict = getRuleSet("strict");
const def = getRuleSet("default");

function solutions(rs, equation) {
  return [...new Set(
    rs.mutate(equation.split(""))
      .filter(rs.evaluate)
      .map(m => m.join("").trim())
  )];
}

describe("strict ruleset", () => {
  it("rejects expressions with a leading operator", () => {
    assert.strictEqual(strict.evaluate("+2+2=4".split("")), false);
    assert.strictEqual(def.evaluate("+2+2=4".split("")), true);
  });

  it("rejects expressions with a trailing operator", () => {
    assert.strictEqual(strict.evaluate("2+2=4+".split("")), false);
    // default also rejects this (eval throws), but checked for completeness:
    assert.strictEqual(def.evaluate("2+2=4+".split("")), false);
  });

  it("'1+2=7' has no solution under strict (-1+2=1 requires the space-rule)", () => {
    assert.deepStrictEqual(solutions(strict, "1+2=7"), []);
    assert.deepStrictEqual(solutions(def, "1+2=7"), ["-1+2=1"]);
  });

  it("strict mutation counts match expectations for representative inputs", () => {
    const cases = [
      // [eq, expectedSolutions, expectedOther]
      ['6+4=4',   2,  2],
      ['1+2=7',   0,  4],
      ['5+7=2',   1,  7],
      ['1*3=5',   2,  9],
      ['3+3=8',   2, 12],
    ];
    for (const [eq, expSol, expOther] of cases) {
      const muts = strict.mutate(eq.split(""));
      const sols = muts.filter(strict.evaluate);
      const other = muts.filter(a => !strict.evaluate(a));
      assert.strictEqual(sols.length, expSol,
        `${eq}: expected ${expSol} solutions, got ${sols.length}: [${sols.map(s => s.join("")).join(", ")}]`);
      assert.strictEqual(other.length, expOther,
        `${eq}: expected ${expOther} other, got ${other.length}`);
    }
  });
});
