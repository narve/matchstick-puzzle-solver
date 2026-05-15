// *********** RULES ****

function createRuleSet(name, defineFn) {
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

    function evaluate(arr) {
        if (arr.indexOf('=') <= -1) return false;
        try {
            return !!eval(" " + arr.join("").replace('=', '==').replace('x', '*') + " ");
        } catch (x) {
            return false;
        }
    }

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
        return transforms([' ', ...arr, ' ']).concat(moves(arr));
    }

    return { name, legals, adds, subs, trans, evaluate, mutate };
}

export function getRuleSets() {
    return [
        createRuleSet("default", (add, transform) => {
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

            add(' ', '1');
        }),
    ];
}

// Legacy API removed — use getRuleSets() and find by name instead
const _default = getRuleSets().find(r => r.name === "default");
const { legals, adds, subs, trans, evaluate, mutate } = _default;

// *********** UI ****

import { samples as samplePuzzles } from './samples.js';
import { injectDefs, charSvg, equationSvg } from './matchstick-svg.js';

const LIST_H = 40;     // height for list items / inline equation previews
const PREVIEW_H = 80;  // height for the live input preview
const TABLE_H = 72;    // height for rules-table characters

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
    const isOK = evaluate(t.split(""));
    const mutations = mutate(t.split(""));
    const solutions = mutations.filter(arr => evaluate(arr))
        .map(m => m.join(""))
        .map(toLink);
    const other = mutations.filter(arr => !evaluate(arr))
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

export function setup() {
    injectDefs(document.body);

    document.querySelector("#equation").addEventListener('input', e => solve(e.srcElement.value));
    const samplesEl = document.querySelector("#samples");
    for (const difficulty of ["easy", "medium", "hard"]) {
        const group = samplePuzzles.filter(s => s.difficulty === difficulty);
        if (group.length === 0) continue;
        const heading = element('li', '');
        heading.innerHTML = `<strong>${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong>`;
        samplesEl.appendChild(heading);
        const ul = document.createElement('ul');
        group.forEach(s => ul.appendChild(toLink(s.puzzle)));
        samplesEl.appendChild(ul);
    }
    putSample(samplePuzzles[0].puzzle);

    // Make rules table:
    const cell = set => {
        const td = document.createElement('td');
        const div = document.createElement('div');
        div.className = 'char-cell';
        div.innerHTML = [...set].map(ch => charSvg(ch, TABLE_H, TABLE_H)).join('');
        td.appendChild(div);
        return td;
    };
    const tbody = document.querySelector('tbody');
    for (const c of legals) {
        if (c === ' ') continue;
        const th = document.createElement('th');
        th.innerHTML = charSvg(c, TABLE_H, TABLE_H);
        const tr = document.createElement('tr');
        tr.appendChild(th);
        tr.appendChild(cell(trans[c]));
        tr.appendChild(cell(adds[c]));
        tr.appendChild(cell(subs[c]));
        tbody.appendChild(tr);
    }
}
