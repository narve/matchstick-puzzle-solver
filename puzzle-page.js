// Entry point for puzzle.html — renders a single puzzle from URL params.
//
// Params:
//   puzzle       URL-encoded equation string, e.g. "1%2B2%3D4". Required
//                unless `puzzle-set` is given, in which case the set's
//                first puzzle is used.
//   ruleset      one of strict | default | flexible. Default "default".
//                Ignored when `puzzle-set` is given (the set entry's
//                own ruleset is used instead).
//   puzzle-set   id of a named set in puzzle-sets.js. Enables prev/next
//                navigation within the set.

import { getRuleSets, getRuleSet, renderRulesTable } from './match.js';
import { injectDefs, equationSvg } from './matchstick-svg.js';
import { findFirstSolution, animateSolve } from './animate.js';
import { equationAnimatableSvg } from './matchstick-svg.js';
import { puzzleSets } from './puzzle-sets.js';

const PREVIEW_H = 160;
const ANIM_H = 110;

const LEGAL_INPUT_RE = /^[0-9+\-*/= ]+$/;

function showInvalid(msg) {
    const el = document.getElementById('invalid-message');
    el.innerHTML = `⚠ ${msg} <a href="index.html">Back to the solver</a> for samples and rules.`;
    el.hidden = false;
    document.getElementById('puzzle-area').hidden = true;
}

/**
 * Resolves the URL params into a normalised view of what to render.
 * Returns `{ puzzle, rulesetName, set?, indexInSet? }` or `{ error }`.
 *
 * Set-mode: if `puzzle-set` is given, the set's entry-defined ruleset
 * is authoritative. If `puzzle` is omitted, the first entry is used.
 */
function resolve(params) {
    const setId = params.get('puzzle-set');
    if (setId) {
        const set = puzzleSets.find(s => s.id === setId);
        if (!set) return { error: `Unknown puzzle set <code>${setId}</code>.` };
        if (!set.puzzles?.length) return { error: `Puzzle set <code>${setId}</code> is empty.` };

        const puzzleParam = params.get('puzzle');
        let indexInSet = 0;
        if (puzzleParam) {
            indexInSet = set.puzzles.findIndex(p => p.puzzle === puzzleParam);
            if (indexInSet < 0) {
                return { error: `Puzzle <code>${puzzleParam}</code> is not part of <em>${set.name}</em>.` };
            }
        }
        const entry = set.puzzles[indexInSet];
        return { puzzle: entry.puzzle, rulesetName: entry.ruleset, set, indexInSet };
    }

    const puzzle = params.get('puzzle');
    if (!puzzle) return { error: 'No puzzle given.' };
    if (!LEGAL_INPUT_RE.test(puzzle)) {
        return { error: `Puzzle <code>${puzzle}</code> contains characters that aren't allowed.` };
    }
    const rulesetName = params.get('ruleset') ?? 'default';
    const known = getRuleSets().map(r => r.name);
    if (!known.includes(rulesetName)) {
        return { error: `Unknown ruleset <code>${rulesetName}</code> (expected one of ${known.join(', ')}).` };
    }
    return { puzzle, rulesetName };
}

function puzzleHrefInSet(set, index) {
    const p = new URLSearchParams({ puzzle: set.puzzles[index].puzzle, 'puzzle-set': set.id });
    return `puzzle.html?${p}`;
}

function setupJourneyNav(set, indexInSet) {
    const nav = document.getElementById('journey-nav');
    const prev = document.getElementById('prev-btn');
    const next = document.getElementById('next-btn');
    const pos  = document.getElementById('journey-pos');

    nav.hidden = false;
    pos.textContent = `${indexInSet + 1} / ${set.puzzles.length}`;

    if (indexInSet > 0) prev.onclick = () => { window.location.href = puzzleHrefInSet(set, indexInSet - 1); };
    else                prev.disabled = true;

    if (indexInSet < set.puzzles.length - 1) next.onclick = () => { window.location.href = puzzleHrefInSet(set, indexInSet + 1); };
    else                                     next.disabled = true;
}

function setup() {
    injectDefs(document.body);

    const params = new URLSearchParams(window.location.search);
    const r = resolve(params);
    if (r.error) {
        showInvalid(r.error);
        return;
    }

    const { puzzle, rulesetName, set, indexInSet } = r;
    const ruleset = getRuleSet(rulesetName);
    document.title = `${puzzle} — Matchstick puzzle`;

    const titleEl = document.getElementById('title');
    if (set) {
        titleEl.innerHTML = `<small style="display:block; color:#7a6a4a; font-size:0.7em; margin-bottom:0.1em;">`
            + `${set.name}</small>Puzzle: ${puzzle}`;
    } else {
        titleEl.textContent =
            `Puzzle: ${puzzle}${rulesetName === 'default' ? '' : ` (${rulesetName})`}`;
    }

    document.getElementById('puzzle-area').hidden = false;

    // Big preview SVG.
    document.getElementById('preview').innerHTML = equationSvg(puzzle, PREVIEW_H);

    // Rules table — populated up-front, hidden behind a disclosure.
    document.getElementById('rules-ruleset-name').textContent = rulesetName;
    renderRulesTable(document.getElementById('rules-body'), ruleset);
    document.getElementById('rules-toggle').hidden = false;

    // Decide what to show below the puzzle. Three cases:
    //   - already-true equation: brief note, no reveal button.
    //   - solvable: reveal button → animate on click → hide on second click.
    //   - unsolvable under this ruleset: brief note, hide reveal button.
    const isOK = ruleset.evaluate(puzzle.split(''));
    const status = document.getElementById('status');
    const animArea = document.getElementById('anim-area');
    const btn = document.getElementById('solve-btn');

    if (isOK) {
        status.innerHTML = `<p style="font-family: sans-serif; color: #2e7d32;">`
            + `This equation is already true — no single-stick move needed.</p>`;
        animArea.hidden = true;
        btn.hidden = true;
    } else {
        const paddedSolution = findFirstSolution(puzzle, ruleset);
        if (!paddedSolution) {
            status.innerHTML = `<p style="font-family: sans-serif; color: #7a6a4a;">`
                + `No single-stick solution under the <strong>${rulesetName}</strong> ruleset. `
                + `Try a more permissive ruleset on the <a href="index.html">solver page</a>.</p>`;
            animArea.hidden = true;
            btn.hidden = true;
        } else {
            wireRevealToggle(btn, animArea, puzzle, paddedSolution);
        }
    }

    // Set-mode wires up prev/next at the bottom.
    if (set) setupJourneyNav(set, indexInSet);
}

/**
 * Two-state reveal: button toggles between hidden anim area + "Reveal
 * the solution" label, and visible anim area + "Hide solution" label.
 * The animation plays on each reveal.
 */
function wireRevealToggle(btn, animArea, puzzle, paddedSolution) {
    const paddedPuzzle = ' ' + puzzle + ' ';
    let revealed = false;
    btn.textContent = 'Reveal the solution';
    animArea.hidden = true;

    btn.addEventListener('click', async () => {
        if (revealed) {
            animArea.hidden = true;
            animArea.innerHTML = '';
            btn.textContent = 'Reveal the solution';
            revealed = false;
            return;
        }
        animArea.hidden = false;
        animArea.innerHTML = equationAnimatableSvg(paddedPuzzle, ANIM_H);
        btn.textContent = 'Hide solution';
        revealed = true;
        const svg = animArea.querySelector('svg.equation-anim');
        btn.disabled = true;
        await animateSolve(svg, paddedPuzzle, paddedSolution);
        btn.disabled = false;
    });
}

setup();
