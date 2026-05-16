// Entry point for puzzle.html — renders a single puzzle from URL params.
//
// Params:
//   puzzle   (required) URL-encoded equation string, e.g. "1%2B2%3D4"
//   ruleset  (optional, default "default") one of strict | default | flexible
//
// Reserved for phase 2 (journey mode):
//   puzzle-set   named puzzle set or comma-separated puzzles
//   index        0-based position within the set

import { getRuleSets, getRuleSet, renderRulesTable } from './match.js';
import { injectDefs, equationSvg } from './matchstick-svg.js';
import { findFirstSolution, wireSolveButton } from './animate.js';

const PREVIEW_H = 160;
const ANIM_H = 110;

const LEGAL_INPUT_RE = /^[0-9+\-*/= ]+$/;

function showInvalid(msg) {
    const el = document.getElementById('invalid-message');
    el.innerHTML = `⚠ ${msg} <a href="index.html">Back to the solver</a> for samples and rules.`;
    el.hidden = false;
    document.getElementById('puzzle-area').hidden = true;
}

function validate(params) {
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

function setup() {
    injectDefs(document.body);

    const params = new URLSearchParams(window.location.search);
    const v = validate(params);
    if (v.error) {
        showInvalid(v.error);
        return;
    }

    const { puzzle, rulesetName } = v;
    const ruleset = getRuleSet(rulesetName);
    document.title = `${puzzle} — Matchstick puzzle`;
    document.getElementById('title').textContent =
        `Puzzle: ${puzzle}${rulesetName === 'default' ? '' : ` (${rulesetName})`}`;

    document.getElementById('puzzle-area').hidden = false;

    // Big preview SVG.
    document.getElementById('preview').innerHTML = equationSvg(puzzle, PREVIEW_H);

    // Rules table — populated up-front, hidden behind a disclosure.
    document.getElementById('rules-ruleset-name').textContent = rulesetName;
    renderRulesTable(document.getElementById('rules-body'), ruleset);
    document.getElementById('rules-toggle').hidden = false;

    // Decide what to show below the puzzle. Three cases:
    //   - already-true equation: brief note, no Show-me UI.
    //   - solvable: Show-me UI, no extra text (the animation IS the answer).
    //   - unsolvable under this ruleset: brief note, hide Show-me UI.
    const isOK = ruleset.evaluate(puzzle.split(''));
    const status = document.getElementById('status');
    const heading = document.getElementById('solve-heading');
    const animArea = document.getElementById('anim-area');
    const btn = document.getElementById('solve-btn');

    if (isOK) {
        status.innerHTML = `<p style="font-family: sans-serif; color: #2e7d32;">`
            + `This equation is already true — no single-stick move needed.</p>`;
        heading.hidden = true;
        animArea.hidden = true;
        btn.hidden = true;
        return;
    }

    const solution = findFirstSolution(puzzle, ruleset);
    if (!solution) {
        status.innerHTML = `<p style="font-family: sans-serif; color: #7a6a4a;">`
            + `No single-stick solution under the <strong>${rulesetName}</strong> ruleset. `
            + `Try a more permissive ruleset on the <a href="index.html">solver page</a>.</p>`;
        heading.hidden = true;
        animArea.hidden = true;
        btn.hidden = true;
        return;
    }

    const anim = wireSolveButton({
        button: btn,
        animArea,
        h: ANIM_H,
        solveLabel: 'Show me!',
        resetLabel: 'Reset',
    });
    anim.setPuzzle(puzzle, ruleset);
}

setup();
