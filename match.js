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


function element(tag, txt, subs = []) {
    const e = document.createElement(tag);
    e.appendChild(document.createTextNode(txt));
    subs.forEach(s => e.appendChild(s));
    return e;
}


function toLink(txt) {
    const li = document.createElement('li');
    li.innerHTML = txt;
    makeLink(li);
    return li;
}


function makeLink(element) {
    element.addEventListener('click', e => putSample(e.srcElement.innerHTML));
}

function putSample(txt) {
    document.querySelector("#equation").value = txt;
    solve(txt);
}

function solve(t) {
    console.log( 'Solving: ', t);

    const isOK = evaluate(t.split(""));
    const mutations = mutate(t.split(""));
    const solutions = mutations.filter(arr => evaluate(arr))
        .map(m => m.join(""))
        .map(toLink);
    const other = mutations.filter(arr => !evaluate(arr))
        .map(m => m.join(""))
        .map(toLink);

    const statusElement = document.querySelector("#status");
    statusElement.innerHTML = '';


    if (!isOK && solutions.length > 0) {
        const q = element('span', t);
        q.classList.add("matchsticks");
        statusElement.appendChild(element('p', `There are ${solutions.length} solution(s) to `, [q]));
        statusElement.appendChild(element('ul', "", solutions));
    }

    statusElement.appendChild(element('p', `${other.length} ${isOK ? 'Possible quiz tasks: ' : 'Incorrect mutations: '}`));
    statusElement.appendChild(element('ul', "", other));
}

import { samples as samplePuzzles } from './samples.js';

export function setup() {

    // Set up gui stuff:
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
    const span = set => element('span', [...set].join(""));
    const tbody = document.querySelector('tbody');
    for (let i = 0; i < legals.length; i++) {
        const c = legals[i];
        const o = element('th', c);
        const t = element('td', "", [span(trans[c])]);
        const a = element('td', "", [span(adds[c])]);
        const s = element('td', "", [span(subs[c])]);
        tbody.appendChild(element('tr', "", [o, t, a, s]));
    }
}
