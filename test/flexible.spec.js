import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuleSet } from "../match.js";

const flex = getRuleSet("flexible");
const def = getRuleSet("default");

function solutions(rs, equation) {
  return [...new Set(
    rs.mutate(equation.split(""))
      .filter(rs.evaluate)
      .map(m => m.join("").trim())
  )];
}

describe("flexible ruleset", () => {
  it("includes alt-form digits in legals", () => {
    assert.ok(flex.legals.includes("b"), "flexible.legals should include 'b'");
    assert.ok(flex.legals.includes("q"), "flexible.legals should include 'q'");
    assert.ok(!def.legals.includes("b"), "default.legals should NOT include 'b'");
    assert.ok(!def.legals.includes("q"), "default.legals should NOT include 'q'");
  });

  it("wires up the 5 ↔ b and 5 ↔ q transforms", () => {
    assert.ok(flex.trans["5"].has("b"));
    assert.ok(flex.trans["b"].has("5"));
    assert.ok(flex.trans["5"].has("q"));
    assert.ok(flex.trans["q"].has("5"));
  });

  it("wires up the b + stick → 6 / q + stick → 9 adds", () => {
    assert.ok(flex.adds["b"].has("6"));
    assert.ok(flex.subs["6"].has("b"));
    assert.ok(flex.adds["q"].has("9"));
    assert.ok(flex.subs["9"].has("q"));
  });

  it("alt chars evaluate as their canonical counterparts", () => {
    assert.strictEqual(flex.evaluate("b+4=10".split("")), true);   // 6+4=10
    assert.strictEqual(flex.evaluate("5+q=14".split("")), true);   // 5+9=14
    assert.strictEqual(flex.evaluate("b+q=15".split("")), true);   // 6+9=15
    assert.strictEqual(flex.evaluate("b+3=10".split("")), false);  // 6+3≠10
  });

  it("'5+5=11' admits a flexible-only solution via alt-6", () => {
    // 5+b=11 (= 5+6 = 11): take the top match off the second 5? Actually
    // the move is: 5 → 6 (add a match). To free that match, we need a sub
    // somewhere. With the 5↔b transform we get for free: change one 5 to
    // b (one stick moved within), then the other 5 stays — but that's a
    // pure transform, no equation balance change. The interesting case is
    // 5+5=11 → 5+b=11 by transform alone: same eval as 5+6=11 → true.
    const sols = solutions(flex, "5+5=11");
    assert.ok(sols.includes("5+b=11") || sols.includes("b+5=11"),
      `expected 5+b=11 or b+5=11 in solutions: [${sols.join(", ")}]`);
  });

  it("default ruleset does not produce alt-form solutions", () => {
    const sols = solutions(def, "5+5=11");
    for (const s of sols) {
      assert.ok(!/[bq]/.test(s), `default solution '${s}' should not contain alt chars`);
    }
  });
});
