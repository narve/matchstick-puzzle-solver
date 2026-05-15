import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuleSets } from "../match.js";

const { evaluate, mutate } = getRuleSets().find(r => r.name === "default");

const testData = [
    ['8+3-4=0', 1, 23],
    ['10+10=8', 1, 23],
    ['6-5=17', 1, 19],
    ['5+7=2', 1, 7],
    ['6+4=4', 2, 2],
    ['3+3=8', 2, 12],
    ['4-1=5', 1, 5],
    ['5+3=6', 2, 14],
    ['6-2=7', 2, 9],
    ['7+1=0', 1, 7],
    ['1111=11 ', 0, 6],
    ['1*3=5', 2, 9],
    ['5/3=1', 2, 6],
    ['7*5/3=2', 1, 15],
];

describe("mutation counts", () => {
  for (const [expr, expSolutions, expOther] of testData) {
    it(`${expr} → ${expSolutions} solution(s), ${expOther} other`, () => {
      const mutations = mutate(expr.split(""));
      const solutions = mutations.filter(evaluate);
      const other = mutations.filter(e => !evaluate(e));

      assert.strictEqual(
        solutions.length, expSolutions,
        `Expected ${expSolutions} solutions, got ${solutions.length}: ${solutions.map(s => s.join("")).join("; ")}`
      );
      assert.strictEqual(
        other.length, expOther,
        `Expected ${expOther} other mutations, got ${other.length}`
      );
    });
  }
});
