import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuleSets } from "../src/match.js";

const { evaluate, mutate } = getRuleSets().find(r => r.name === "default");

const testData = [
    ['8+3-4=0', 1, 37],
    ['10+10=8', 2, 32],
    ['6-5=17', 1, 31],
    ['5+7=2', 1, 13],
    ['6+4=4', 2, 8],
    ['3+3=8', 3, 21],
    ['4-1=5', 1, 12],
    ['5+3=6', 2, 20],
    ['6-2=7', 2, 18],
    ['7+1=0', 2, 12],
    ['1111=11 ', 0, 9],
    ['1*3=5', 2, 13],
    ['5/3=1', 2, 8],
    ['7*5/3=2', 1, 21],
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
