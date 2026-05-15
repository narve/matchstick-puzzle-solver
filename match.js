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

function defaultEvaluate(arr) {
    if (arr.indexOf('=') <= -1) return false;
    try {
        return !!eval(" " + arr.join("").replace('=', '==').replace('x', '*') + " ");
    } catch (x) {
        return false;
    }
}

function strictEvaluate(arr) {
    const s = arr.join("").trim();
    if (/^[+\-*/=]/.test(s) || /[+\-*/=]$/.test(s)) return false;
    return defaultEvaluate(arr);
}

/**
 * The shared backbone of mutation rules used by every consumer-grade ruleset.
 * Does NOT include the boundary `add(' ', '-')` rule — opt in per ruleset.
 */
function defineDefaultMutations(add, transform) {
    add('-', '+');
    add('-', '=');
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

/**
 * @returns {Ruleset}
 */
function createRuleSet(name, description, defineFn, evaluateFn = defaultEvaluate) {
    const legals = "0123456789+-*/= ".split("");
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
            "default",
            "Lenient JS-style evaluator. A match dropped into the empty space on either side of the puzzle counts as a '-', so equations like -1+2=1 are legal solutions.",
            (add, transform) => {
                defineDefaultMutations(add, transform);
                // A '-' is one matchstick; adding it to an empty cell (the
                // implicit space on either side of the puzzle) materialises it.
                add(' ', '-');
            },
        ),
        createRuleSet(
            "strict",
            "Classic matchstick rules. A match cannot appear from nowhere, and expressions starting or ending with an operator are rejected.",
            defineDefaultMutations,
            strictEvaluate,
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

function toLink(txt) {
    txt = txt.trim();
    const li = document.createElement('li');
    li.dataset.equation = txt;
    li.innerHTML = equationSvg(txt, LIST_H);
    li.addEventListener('click', e => putSample(e.currentTarget.dataset.equation));
    return li;
}

function putSample(txt) {
    document.querySelector("#equation").value = txt;
    solve(txt);
}

function solve(t) {
    const isOK = active.evaluate(t.split(""));
    const mutations = active.mutate(t.split(""));
    const solutions = mutations.filter(arr => active.evaluate(arr))
        .map(m => m.join(""))
        .map(toLink);
    const other = mutations.filter(arr => !active.evaluate(arr))
        .map(m => m.join(""))
        .map(toLink);

    const preview = document.querySelector("#preview");
    if (preview) preview.innerHTML = equationSvg(t, PREVIEW_H);

    const validity = document.querySelector("#validity");
    if (validity) {
        validity.textContent = isOK ? '✓' : '✗';
        validity.style.color = isOK ? '#2e7d32' : '#c62828';
        validity.title = isOK ? 'Equation is correct' : 'Equation is incorrect';
    }

    const statusElement = document.querySelector("#status");
    statusElement.innerHTML = '';

    if (!isOK && solutions.length > 0) {
        statusElement.appendChild(element('p', `There are ${solutions.length} solution(s):`));
        statusElement.appendChild(element('ul', "", solutions));
    } else if (!isOK) {
        statusElement.appendChild(element('p', 'No solutions found 😢'));
    }

    if (isOK) {
        statusElement.appendChild(element('p', `${other.length} possible quiz tasks: `));
        statusElement.appendChild(element('ul', "", other));
    }
}

function renderSamples() {
    const samplesEl = document.querySelector("#samples");
    samplesEl.innerHTML = '';
    const visible = samplePuzzles.filter(s => isSampleVisible(s, active.name));
    for (const difficulty of ["easy", "medium", "hard"]) {
        const group = visible.filter(s => s.difficulty === difficulty);
        if (group.length === 0) continue;
        const heading = element('li', '');
        heading.innerHTML = `<strong>${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong>`;
        samplesEl.appendChild(heading);
        const ul = document.createElement('ul');
        group.forEach(s => ul.appendChild(toLink(s.puzzle)));
        samplesEl.appendChild(ul);
    }
    return visible;
}

function isSampleVisible(sample, rulesetName) {
    // A sample tagged with a ruleset shows whenever the active ruleset is at
    // least as permissive. "strict" is the most restrictive; any sample
    // workable under strict is also workable under more permissive rulesets.
    const tag = sample.ruleset ?? "strict";
    if (rulesetName === "default") return tag === "strict" || tag === "default";
    if (rulesetName === "strict") return tag === "strict";
    return tag === rulesetName;
}

function renderRulesTable() {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    const renderChar = ch =>
        ch === ' ' ? '<span class="empty-slot">(empty)</span>' : charSvg(ch, TABLE_H, TABLE_H);
    const cell = set => {
        const td = document.createElement('td');
        const div = document.createElement('div');
        div.className = 'char-cell';
        div.innerHTML = [...set].map(renderChar).join('');
        td.appendChild(div);
        return td;
    };
    for (const c of active.legals) {
        const th = document.createElement('th');
        th.innerHTML = renderChar(c);
        const tr = document.createElement('tr');
        tr.appendChild(th);
        tr.appendChild(cell(active.trans[c]));
        tr.appendChild(cell(active.adds[c]));
        tr.appendChild(cell(active.subs[c]));
        tbody.appendChild(tr);
    }
}

function setActiveRuleset(name) {
    active = getRuleSet(name);
    localStorage.setItem('ruleset', name);
    const desc = document.querySelector('#ruleset-description');
    if (desc) desc.textContent = active.description;
    renderSamples();
    renderRulesTable();
    solve(document.querySelector("#equation").value);
}

export function setup() {
    injectDefs(document.body);

    const saved = localStorage.getItem('ruleset');
    const initial = getRuleSets().some(r => r.name === saved) ? saved : "default";
    active = getRuleSet(initial);

    const radios = document.querySelectorAll('input[name="ruleset"]');
    radios.forEach(r => {
        r.checked = (r.value === initial);
        r.addEventListener('change', e => { if (e.target.checked) setActiveRuleset(e.target.value); });
    });
    const desc = document.querySelector('#ruleset-description');
    if (desc) desc.textContent = active.description;

    document.querySelector("#equation").addEventListener('input', e => solve(e.srcElement.value));

    const visible = renderSamples();
    renderRulesTable();
    putSample((visible[0] ?? samplePuzzles[0]).puzzle);
}
