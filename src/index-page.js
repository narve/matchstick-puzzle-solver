// Entry point for index.html — the live solver UI.

import {
    getRuleSet, getRuleSets,
    canonicalise, isSampleVisible, RULESET_PERMISSIVENESS,
} from './match.js';
import { samples as samplePuzzles } from './samples.js';
import { injectDefs, equationSvg } from './matchstick-svg.js';
import {
    renderSolutionsBlock, renderRulesTable, renderRadioGroup,
    renderDescription, titleCase, makeEquationLi,
} from './render.js';
import { puzzleHref } from './puzzle-url.js';

const PREVIEW_H = 80;
const MAX_SAMPLES_PER_DIFFICULTY = 6;
const DIFFICULTIES = ["easy", "medium", "hard"];

/** @type {import('./match.js').Ruleset} */
let active = getRuleSet("default");
let activeDifficulty = "easy";

function toSampleLink(txt) {
    const li = makeEquationLi(txt, { onClick: putSample });
    // External-link arrow that opens the same puzzle in a standalone tab,
    // under the index page's current ruleset.
    const open = document.createElement('a');
    open.className = 'sample-open';
    open.href = puzzleHref({ puzzle: txt, ruleset: active.name });
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

function solve(t) {
    document.querySelector("#preview").innerHTML = equationSvg(t, PREVIEW_H);

    const { isOK } = renderSolutionsBlock(
        document.querySelector("#status"),
        active,
        t,
        { onSolutionClick: putSample },
    );

    const validity = document.querySelector("#validity");
    validity.textContent = isOK ? '✓' : '✗';
    validity.style.color = isOK ? 'var(--ok)' : 'var(--err)';
    validity.title = isOK ? 'Equation is correct' : 'Equation is incorrect';
}

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
    renderRadioGroup(document.querySelector('#difficulty-filter'), {
        name: 'difficulty',
        options: DIFFICULTIES.map(d => ({ value: d, label: titleCase(d) })),
        selected: activeDifficulty,
        onChange: setActiveDifficulty,
        labelClass: 'chip-soft',
    });
}

function setActiveDifficulty(d) {
    activeDifficulty = d;
    localStorage.setItem('difficulty', d);
    renderSamples();
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
    renderRulesTable(document.querySelector('#rules-table'), active);
    solve(document.querySelector("#equation").value);
}

export function setup() {
    injectDefs(document.body);

    const saved = localStorage.getItem('ruleset');
    const initial = getRuleSets().some(r => r.name === saved) ? saved : "default";
    active = getRuleSet(initial);

    const savedDifficulty = localStorage.getItem('difficulty');
    if (DIFFICULTIES.includes(savedDifficulty)) activeDifficulty = savedDifficulty;

    renderRadioGroup(document.querySelector('#ruleset-options'), {
        name: 'ruleset',
        options: getRuleSets().map(rs => ({ value: rs.name, label: titleCase(rs.name) })),
        selected: initial,
        onChange: setActiveRuleset,
    });
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
    renderRulesTable(document.querySelector('#rules-table'), active);
    putSample((visible[0] ?? samplePuzzles[0]).puzzle);
}
