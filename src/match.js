// Matchstick rules engine. Pure JS — no DOM. UI/rendering lives in
// render.js (page-agnostic) and index-page.js / puzzle-page.js (per-page).

/**
 * A ruleset defines how matchstick characters can be mutated and how an
 * equation is judged to be true.
 *
 * @typedef {Object} Ruleset
 * @property {string} name         Stable identifier, e.g. "default".
 * @property {string} description  Human-readable description shown in the UI.
 * @property {string[]} legals     Characters that this ruleset operates over.
 * @property {Record<string, Set<string>>} adds   c → chars producible by ADDING a match.
 * @property {Record<string, Set<string>>} subs   c → chars producible by REMOVING a match.
 * @property {Record<string, Set<string>>} trans  c → chars producible by MOVING one of c's matches (same count).
 * @property {(arr: string[]) => boolean} evaluate Whether the expression is mathematically true under this ruleset's strictness.
 * @property {(arr: string[]) => string[][]} mutate All single-match mutations (transforms + moves).
 */

/**
 * Maps alt-form characters back to their canonical counterparts for
 * evaluation, input normalisation, and any other place where the math
 * matters but the rendering doesn't.
 */
export const ALT_TO_CANONICAL = { b: '6', q: '9', M: '-', P: '+', E: '=' };

export function canonicalise(arr) {
    return arr.map(c => ALT_TO_CANONICAL[c] ?? c).join('');
}

function defaultEvaluate(arr) {
    const canonical = canonicalise(arr);
    if (canonical.indexOf('=') <= -1) return false;
    try {
        return !!eval(" " + canonical.replace('=', '==').replace('x', '*') + " ");
    } catch (x) {
        return false;
    }
}

function strictEvaluate(arr) {
    const s = canonicalise(arr).trim();
    if (/^[+\-*/=]/.test(s) || /[+\-*/=]$/.test(s)) return false;
    return defaultEvaluate(arr);
}

/**
 * Mutation rules shared by every ruleset. Excludes:
 *   - the boundary `add(' ', '-')` rule (default/flexible opt in)
 *   - `add('-', '=')` so that flexible can substitute alt-form operator
 *     rules without first cancelling the canonical one
 */
function defineCoreMutations(add, transform) {
    add('-', '+');
    add('0', '8');
    add('1', '7');
    add('3', '9');
    add('5', '9');
    add('5', '6');
    add('6', '8');
    add('9', '8');
    add('/', '*');

    transform('3', '5');
    transform('3', '2');
    transform('6', '9');
    transform('0', '6');
    transform('0', '9');
}

function defineDefaultMutations(add, transform) {
    defineCoreMutations(add, transform);
    add('-', '=');  // canonical '-' + stick → canonical '='
}

/**
 * @returns {Ruleset}
 */
function createRuleSet(name, description, defineFn, evaluateFn = defaultEvaluate, extraLegals = []) {
    // Real characters first, alt-form characters next, the empty/boundary
    // pseudo-character last so it appears at the bottom of the rules table.
    const legals = "0123456789+-*/=".split("").concat(extraLegals, [' ']);
    const adds = {};
    const subs = {};
    const trans = {};

    legals.forEach(c => [adds, subs, trans].forEach(s => s[c] = new Set()));

    function add(c1, c2) {
        adds[c1].add(c2);
        subs[c2].add(c1);
    }

    function transform(c1, c2) {
        trans[c1].add(c2);
        trans[c2].add(c1);
    }

    defineFn(add, transform);

    function replace(arr, index, re) {
        const res = [...arr];
        res[index] = re;
        return res;
    }

    function transforms(arr) {
        return arr.flatMap((c, i) => [...trans[c]].map(re => replace(arr, i, re)));
    }

    function moves(arr) {
        return arr.flatMap((c, i) => [...subs[c]].flatMap(re => adding(replace(arr, i, re), i)));
    }

    function adding(arr, except) {
        return arr.flatMap((c, i) => i === except ? [] : [...adds[c]].map(re => replace(arr, i, re)));
    }

    function mutate(arr) {
        const padded = [' ', ...arr, ' '];
        return transforms(padded).concat(moves(padded));
    }

    return { name, description, legals, adds, subs, trans, evaluate: evaluateFn, mutate };
}

let _cachedRuleSets = null;

/** @returns {Ruleset[]} */
export function getRuleSets() {
    return _cachedRuleSets ??= buildRuleSets();
}

function buildRuleSets() {
    return [
        createRuleSet(
            "strict",
            "Classic simple matchstick rules. Move exactly one match; the result should be a simple equation, like 6+4=4 → 8-4=4.",
            defineDefaultMutations,
            strictEvaluate,
        ),
        createRuleSet(
            "default",
            "A bit more flexible: a match can also be moved into the empty space before the equation, becoming a leading '-'. For example, 1+2=7 → -1+2=1.",
            (add, transform) => {
                defineDefaultMutations(add, transform);
                // A '-' is one matchstick; adding it to an empty cell (the
                // implicit space on either side of the puzzle) materialises it.
                add(' ', '-');
            },
        ),
        createRuleSet(
            "flexible",
            "9 and 6 can be written in two variants, and - and = each have a (slightly misaligned) alternative form, shown when a match has moved into/out of them. Examples: 5+5=11 → 6+5=11 (alternative 6); 2-5=3 → 2=5-3 (=↔- swap).",
            (add, transform) => {
                defineCoreMutations(add, transform);
                add(' ', '-');                  // boundary rule (stick lands at canonical y)

                // Digit alts
                transform('5', 'b');            // 5 ↔ alt-6
                transform('5', 'q');            // 5 ↔ alt-9
                add('b', '6');                  // alt-6 + top stick = canonical 6
                add('q', '9');                  // alt-9 + bottom stick = canonical 9

                // Operator alts (replaces the canonical add('-', '='))
                add('M', '=');                  // alt-minus + stick → canonical equals
                add('-', 'E');                  // canonical minus + stick → alt equals
                transform('+', 'E');            // + ↔ alt equals (out of alignment)
                transform('=', 'P');            // = ↔ alt plus  (out of alignment)
            },
            defaultEvaluate,
            ['b', 'q', 'M', 'P', 'E'],
        ),
    ];
}

/** @param {string} name @returns {Ruleset} */
export function getRuleSet(name) {
    const rs = getRuleSets().find(r => r.name === name);
    if (!rs) throw new Error(`Unknown ruleset: ${name}`);
    return rs;
}

// Ruleset permissiveness order (lowest → highest). A sample tagged with X
// is visible under rulesets at index ≥ index(X), because every move usable
// under X is also usable under any more permissive ruleset.
export const RULESET_PERMISSIVENESS = ["strict", "default", "flexible"];

export function isSampleVisible(sample, rulesetName) {
    const tag = sample.ruleset ?? "strict";
    const tagIdx = RULESET_PERMISSIVENESS.indexOf(tag);
    const activeIdx = RULESET_PERMISSIVENESS.indexOf(rulesetName);
    return tagIdx >= 0 && activeIdx >= tagIdx;
}
