// Page-agnostic HTML rendering helpers. Take a container element and the
// data to render; no global state, no localStorage, no page-specific
// selectors. Consumed by index-page.js, puzzle-page.js, and media.html.

import { ALT_TO_CANONICAL } from './match.js';
import { charSvg, equationSvg } from './matchstick-svg.js';

const LIST_H = 40;     // height for list items / inline equation previews
const TABLE_H = 72;    // default height for rules-table characters
const MAX_QUIZ_TASKS = 5;

export const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1);

function element(tag, txt, subs = []) {
    const e = document.createElement(tag);
    e.appendChild(document.createTextNode(txt));
    subs.forEach(s => e.appendChild(s));
    return e;
}

export function makeEquationLi(txt, { onClick } = {}) {
    txt = txt.trim();
    const li = document.createElement('li');
    li.dataset.equation = txt;
    li.innerHTML = equationSvg(txt, LIST_H);
    if (onClick) li.addEventListener('click', e => onClick(e.currentTarget.dataset.equation));
    return li;
}

/**
 * Renders the "Found N solutions - Reveal" / "No solutions" / quiz-tasks
 * UI for puzzle text `t` under `ruleset`, into `container`.
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

/**
 * Render the rules table for a ruleset into `container`.
 * Builds the full `<table>` (thead + tbody).
 */
export function renderRulesTable(container, ruleset, charSize = TABLE_H) {
    container.innerHTML =
        '<table><thead><tr>'
        + '<th>Character</th><th>Move</th><th>Add</th><th>Remove</th>'
        + '</tr></thead><tbody></tbody></table>';
    const tbody = container.querySelector('tbody');
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

/**
 * Render a group of radio inputs into `container`. Each option becomes a
 * `<label><input type="radio"><span>Label</span></label>`. The label gets
 * `labelClass` (optional). `onChange` fires with the picked value.
 */
export function renderRadioGroup(container, { name, options, selected, onChange, labelClass }) {
    if (!container) return;
    container.innerHTML = '';
    for (const opt of options) {
        const label = document.createElement('label');
        if (labelClass) label.className = labelClass;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = name;
        input.value = opt.value;
        input.checked = (opt.value === selected);
        input.addEventListener('change', e => { if (e.target.checked) onChange(e.target.value); });
        const span = document.createElement('span');
        span.textContent = opt.label;
        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
    }
}

/** Wraps any equation-like substring (chars 0-9, +-*\/=, length ≥3, containing
 *  '=') in a clickable <a class="eq-link">, so descriptive text can offer
 *  interactive examples that load into the input on click. */
export function renderDescription(text) {
    return text.replace(/[\d+\-*/=]{3,}/g, m =>
        m.includes('=') ? `<a class="eq-link" data-equation="${m}">${m}</a>` : m
    );
}
