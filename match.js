// *********** RULES ****

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

function canonicalise(arr) {
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

/** @returns {Ruleset[]} */
export function getRuleSets() {
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

// *********** UI ****

import { samples as samplePuzzles } from './samples.js';
import { injectDefs, charSvg, equationSvg } from './matchstick-svg.js';

const LIST_H = 40;     // height for list items / inline equation previews
const PREVIEW_H = 80;  // height for the live input preview
const TABLE_H = 72;    // height for rules-table characters

/** @type {Ruleset} */
let active = getRuleSet("default");

function element(tag, txt, subs = []) {
    const e = document.createElement(tag);
    e.appendChild(document.createTextNode(txt));
    subs.forEach(s => e.appendChild(s));
    return e;
}

function makeEquationLi(txt, { onClick } = {}) {
    txt = txt.trim();
    const li = document.createElement('li');
    li.dataset.equation = txt;
    li.innerHTML = equationSvg(txt, LIST_H);
    if (onClick) li.addEventListener('click', e => onClick(e.currentTarget.dataset.equation));
    return li;
}

function puzzleHref(puzzle, rulesetName) {
    const p = new URLSearchParams({ puzzle });
    if (rulesetName && rulesetName !== 'default') p.set('ruleset', rulesetName);
    return `puzzle.html?${p}`;
}

function toSampleLink(txt) {
    const li = makeEquationLi(txt, { onClick: putSample });
    // External-link arrow that opens the same puzzle in a standalone tab,
    // under the index page's current ruleset.
    const open = document.createElement('a');
    open.className = 'sample-open';
    open.href = puzzleHref(txt, active.name);
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = '↗';
    open.title = 'Open in new tab';
    open.addEventListener('click', e => e.stopPropagation());
    li.appendChild(open);
    return li;
}

function putSample(txt) {
    // The <input> renders text only, so we strip alt-form codes (b, q, …)
    // back to canonical chars for it. The live preview (#preview) and any
    // solution lists keep the raw form so alt SVGs stay visible there.
    document.querySelector("#equation").value = canonicalise(txt.split(""));
    solve(txt);
}

const MAX_QUIZ_TASKS = 5;

/**
 * Renders the "Found N solutions - Reveal" / "No solutions" / quiz-tasks
 * UI for puzzle text `t` under `ruleset`, into `container`. Used by the
 * live-input solver in index.html and by the standalone puzzle.html page.
 *
 * @param {HTMLElement} container  element whose contents will be replaced
 * @param {Ruleset} ruleset
 * @param {string} t  the puzzle equation as a plain string
 * @param {object} [opts]
 * @param {(eq:string)=>void} [opts.onSolutionClick]  if given, each
 *        rendered list item is clickable and invokes this callback with
 *        the equation it represents
 * @returns {{ isOK: boolean, solutions: string[], other: string[] }}
 */
export function renderSolutionsBlock(container, ruleset, t, { onSolutionClick } = {}) {
    const arr = t.split("");
    const isOK = ruleset.evaluate(arr);
    const mutations = ruleset.mutate(arr);
    const solutions = mutations.filter(m => ruleset.evaluate(m)).map(m => m.join(""));
    const other = mutations.filter(m => !ruleset.evaluate(m)).map(m => m.join(""));

    const makeLi = txt => makeEquationLi(txt, { onClick: onSolutionClick });

    container.innerHTML = '';

    if (!isOK && solutions.length > 0) {
        const p = element('p', `Found ${solutions.length} solution${solutions.length === 1 ? '' : 's'} - `);
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Reveal';
        details.appendChild(summary);
        details.addEventListener('toggle', () => {
            summary.textContent = details.open ? 'Hide' : 'Reveal';
        });
        details.appendChild(element('ul', "", solutions.map(makeLi)));
        p.appendChild(details);
        container.appendChild(p);
    } else if (!isOK) {
        container.appendChild(element('p', 'No solutions found 😢'));
    } else {
        const shown = other.slice(0, MAX_QUIZ_TASKS);
        const label = other.length > MAX_QUIZ_TASKS
            ? `Found ${other.length} possible quiz tasks - showing ${MAX_QUIZ_TASKS}:`
            : `${other.length} possible quiz tasks: `;
        container.appendChild(element('p', label));
        container.appendChild(element('ul', "", shown.map(makeLi)));
    }
    return { isOK, solutions, other };
}

function solve(t) {
    const preview = document.querySelector("#preview");
    if (preview) preview.innerHTML = equationSvg(t, PREVIEW_H);

    const { isOK } = renderSolutionsBlock(
        document.querySelector("#status"),
        active,
        t,
        { onSolutionClick: putSample },
    );

    const validity = document.querySelector("#validity");
    if (validity) {
        validity.textContent = isOK ? '✓' : '✗';
        validity.style.color = isOK ? '#2e7d32' : '#c62828';
        validity.title = isOK ? 'Equation is correct' : 'Equation is incorrect';
    }
}

const MAX_SAMPLES_PER_DIFFICULTY = 6;
const DIFFICULTIES = ["easy", "medium", "hard"];
let activeDifficulty = "easy";

function renderSamples() {
    const samplesEl = document.querySelector("#samples");
    samplesEl.innerHTML = '';
    const activeIdx = RULESET_PERMISSIVENESS.indexOf(active.name);
    // Prefer samples tagged closest to the active ruleset so e.g. picking
    // 'flexible' surfaces its own showcase puzzles rather than always the
    // strict-tagged ones.
    const rank = s => Math.abs(RULESET_PERMISSIVENESS.indexOf(s.ruleset) - activeIdx);
    const group = samplePuzzles
        .filter(s => isSampleVisible(s, active.name) && s.difficulty === activeDifficulty)
        .sort((a, b) => rank(a) - rank(b))
        .slice(0, MAX_SAMPLES_PER_DIFFICULTY);
    const ul = document.createElement('ul');
    group.forEach(s => ul.appendChild(toSampleLink(s.puzzle)));
    samplesEl.appendChild(ul);
    return group;
}

function renderDifficultyFilter() {
    const el = document.querySelector('#difficulty-filter');
    if (!el) return;
    el.innerHTML = '';
    for (const d of DIFFICULTIES) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'difficulty';
        input.value = d;
        input.checked = (d === activeDifficulty);
        input.addEventListener('change', e => { if (e.target.checked) setActiveDifficulty(e.target.value); });
        const span = document.createElement('span');
        span.textContent = d.charAt(0).toUpperCase() + d.slice(1);
        label.appendChild(input);
        label.appendChild(span);
        el.appendChild(label);
    }
}

function setActiveDifficulty(d) {
    activeDifficulty = d;
    localStorage.setItem('difficulty', d);
    renderSamples();
}

// Ruleset permissiveness order (lowest → highest). A sample tagged with X
// is visible under rulesets at index ≥ index(X), because every move usable
// under X is also usable under any more permissive ruleset.
const RULESET_PERMISSIVENESS = ["strict", "default", "flexible"];

function isSampleVisible(sample, rulesetName) {
    const tag = sample.ruleset ?? "strict";
    const tagIdx = RULESET_PERMISSIVENESS.indexOf(tag);
    const activeIdx = RULESET_PERMISSIVENESS.indexOf(rulesetName);
    return tagIdx >= 0 && activeIdx >= tagIdx;
}

/**
 * Render the rules table for a ruleset into a `<tbody>`.
 * Shared by the main UI and media.html.
 */
export function renderRulesTable(tbody, ruleset, charSize = TABLE_H) {
    tbody.innerHTML = '';
    // Subject = the row character (left column). Result = a cell value
    // showing what one move produces. The space pseudo-char gets different
    // labels in each role: "(empty)" as a subject, "nothing" as a result.
    const renderSubject = ch =>
        ch === ' ' ? '<span class="empty-slot">(empty)</span>' : charSvg(ch, charSize, charSize);
    const renderResult = ch =>
        ch === ' ' ? '<span class="empty-slot">nothing</span>' : charSvg(ch, charSize, charSize);
    const cell = set => {
        const td = document.createElement('td');
        const div = document.createElement('div');
        div.className = 'char-cell';
        div.innerHTML = [...set].map(renderResult).join('');
        td.appendChild(div);
        return td;
    };
    for (const c of ruleset.legals) {
        // Hide alt-form rows (b, q, M, P, E …): every rule involving them
        // is also expressed in the canonical row (e.g. trans['5'] already
        // contains 'b', so the 'b' row would just duplicate that info).
        if (c in ALT_TO_CANONICAL) continue;
        // Hide the space pseudo-row when no rules involve it (e.g. strict
        // disables the boundary rule). It's not a typeable character, so
        // showing it with three blank cells is pure clutter.
        if (c === ' ' && ruleset.trans[c].size === 0 && ruleset.adds[c].size === 0 && ruleset.subs[c].size === 0)
            continue;
        const th = document.createElement('th');
        th.innerHTML = renderSubject(c);
        const tr = document.createElement('tr');
        tr.appendChild(th);
        tr.appendChild(cell(ruleset.trans[c]));
        tr.appendChild(cell(ruleset.adds[c]));
        tr.appendChild(cell(ruleset.subs[c]));
        tbody.appendChild(tr);
    }
}

/** Wraps any equation-like substring (chars 0-9, +-*\/=, length ≥3, containing
 *  '=') in a clickable <a class="eq-link">, so the description can offer
 *  interactive examples that load into the input on click. */
function renderDescription(text) {
    return text.replace(/[\d+\-*/=]{3,}/g, m =>
        m.includes('=') ? `<a class="eq-link" data-equation="${m}">${m}</a>` : m
    );
}

function showDescription() {
    const desc = document.querySelector('#ruleset-description');
    if (desc) desc.innerHTML = renderDescription(active.description);
}

function setActiveRuleset(name) {
    active = getRuleSet(name);
    localStorage.setItem('ruleset', name);
    showDescription();
    renderSamples();
    renderRulesTable(document.querySelector('tbody'), active);
    solve(document.querySelector("#equation").value);
}

export function setup() {
    injectDefs(document.body);

    const saved = localStorage.getItem('ruleset');
    const initial = getRuleSets().some(r => r.name === saved) ? saved : "default";
    active = getRuleSet(initial);

    const savedDifficulty = localStorage.getItem('difficulty');
    if (DIFFICULTIES.includes(savedDifficulty)) activeDifficulty = savedDifficulty;

    const options = document.querySelector('#ruleset-options');
    if (options) {
        options.innerHTML = '';
        for (const rs of getRuleSets()) {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'ruleset';
            input.value = rs.name;
            input.checked = (rs.name === initial);
            input.addEventListener('change', e => { if (e.target.checked) setActiveRuleset(e.target.value); });
            label.appendChild(input);
            label.append(' ' + rs.name.charAt(0).toUpperCase() + rs.name.slice(1));
            options.appendChild(label);
        }
    }
    const desc = document.querySelector('#ruleset-description');
    if (desc) {
        showDescription();
        // Delegated click handler — every equation in any description is clickable.
        desc.addEventListener('click', e => {
            const a = e.target.closest('.eq-link');
            if (a) putSample(a.dataset.equation);
        });
    }

    document.querySelector("#equation").addEventListener('input', e => solve(e.srcElement.value));

    renderDifficultyFilter();
    const visible = renderSamples();
    renderRulesTable(document.querySelector('tbody'), active);
    putSample((visible[0] ?? samplePuzzles[0]).puzzle);
}
