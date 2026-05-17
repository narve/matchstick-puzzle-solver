// Single-stick-move animation for matchstick puzzles. The puzzle is
// rendered as an inline SVG where each stick is its own addressable
// <g class="seg" data-pos data-key>; comparing the puzzle and solution
// stick-key sets per position yields the moves, which are animated via a
// requestAnimationFrame loop in three phases: lift → travel → place.

import { equationAnimatableSvg, charSegments, VB_W } from './matchstick-svg.js';

const DEFAULTS = {
    h: 90,
    liftMs: 800, moveMs: 800, placeMs: 800,
    liftDy: -22, liftScale: 0.30,
    restScale: 0.20,
};

export const padPuzzle = p => ' ' + p + ' ';

/**
 * Returns the first solution as a padded string (length = puzzle.length + 2),
 * or `null` if no solution exists. Prefers a mutation whose trimmed join
 * equals `preferred` so hand-authored solutions in samples.js render
 * faithfully; otherwise falls back to the first mutation that evaluates
 * true under `ruleset`.
 */
export function findFirstSolution(puzzle, ruleset, preferred) {
    const mutations = ruleset.mutate(puzzle.split(''));
    let found;
    if (preferred) found = mutations.find(arr => arr.join('').trim() === preferred);
    if (!found) found = mutations.find(arr => ruleset.evaluate(arr));
    return found ? found.join('') : null;
}

function diffSegments(paddedPuzzle, paddedSolution) {
    const removed = [], added = [];
    const n = Math.max(paddedPuzzle.length, paddedSolution.length);
    for (let i = 0; i < n; i++) {
        const pSegs = charSegments(paddedPuzzle[i] ?? ' ');
        const sSegs = charSegments(paddedSolution[i] ?? ' ');
        const pKeys = new Set(pSegs.map(x => x.key));
        const sKeys = new Set(sSegs.map(x => x.key));
        for (const seg of pSegs) if (!sKeys.has(seg.key)) removed.push({ pos: i, seg });
        for (const seg of sSegs) if (!pKeys.has(seg.key)) added.push({ pos: i, seg });
    }
    // Naive pair-up: removed[i] → added[i]. For single-stick moves
    // (every sample today) this is exactly one of each.
    return removed.map((r, i) => ({ from: r, to: added[i] })).filter(p => p.to);
}

const lerp = (a, b, u) => a + (b - a) * u;
const easeInOut = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const xform = (tx, ty, rot, sc) => `translate(${tx},${ty}) rotate(${rot}) scale(${sc})`;

/**
 * Runs the animation. Resolves when all sticks have landed.
 * Mutates the source <g class="seg"> elements in `svg`: their `transform`
 * attribute interpolates through the keyframes, and on completion their
 * `data-pos` / `data-key` are updated to the destination so a re-diff
 * (e.g. after a state change) would be correct.
 */
export function animateSolve(svg, paddedPuzzle, paddedSolution, opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    const moves = diffSegments(paddedPuzzle, paddedSolution);
    if (moves.length === 0) return Promise.resolve();
    const tracks = moves.map(({ from, to }) => {
        const g = svg.querySelector(
            `g.seg[data-pos="${from.pos}"][data-key="${from.seg.key}"]`);
        if (!g) return null;
        return {
            g, to,
            srcX: from.seg.tx + from.pos * VB_W, srcY: from.seg.ty, srcRot: from.seg.rot,
            dstX: to.seg.tx   + to.pos   * VB_W, dstY: to.seg.ty,   dstRot: to.seg.rot,
        };
    }).filter(Boolean);
    const TOTAL = o.liftMs + o.moveMs + o.placeMs;
    const liftEnd = o.liftMs / TOTAL;
    const moveEnd = (o.liftMs + o.moveMs) / TOTAL;
    return new Promise(resolve => {
        const t0 = performance.now();
        function frame(now) {
            const t = Math.min(1, (now - t0) / TOTAL);
            for (const tr of tracks) {
                let x, y, rot, sc;
                if (t < liftEnd) {
                    const u = easeInOut(t / liftEnd);
                    x = tr.srcX; y = lerp(tr.srcY, tr.srcY + o.liftDy, u);
                    rot = tr.srcRot; sc = lerp(o.restScale, o.liftScale, u);
                } else if (t < moveEnd) {
                    const u = easeInOut((t - liftEnd) / (moveEnd - liftEnd));
                    x = lerp(tr.srcX, tr.dstX, u);
                    y = lerp(tr.srcY + o.liftDy, tr.dstY + o.liftDy, u);
                    rot = lerp(tr.srcRot, tr.dstRot, u); sc = o.liftScale;
                } else {
                    const u = easeInOut((t - moveEnd) / (1 - moveEnd));
                    x = tr.dstX; y = lerp(tr.dstY + o.liftDy, tr.dstY, u);
                    rot = tr.dstRot; sc = lerp(o.liftScale, o.restScale, u);
                }
                tr.g.setAttribute('transform', xform(x, y, rot, sc));
            }
            if (t < 1) requestAnimationFrame(frame);
            else {
                for (const tr of tracks) {
                    tr.g.setAttribute('transform', xform(tr.dstX, tr.dstY, tr.dstRot, o.restScale));
                    tr.g.dataset.pos = String(tr.to.pos);
                    tr.g.dataset.key = tr.to.seg.key;
                }
                resolve();
            }
        }
        requestAnimationFrame(frame);
    });
}

/**
 * Renders the puzzle into `animArea` as an addressable-stick SVG and
 * wires the button so:
 *   - click while at rest → animate to the solution (button → "Reset")
 *   - click while solved  → re-render the original puzzle (button → "Solve")
 *
 * Returns `{ setPuzzle }`. Call `setPuzzle(puzzle, ruleset, preferred?)`
 * to swap to a different puzzle (the media.html sample picker uses this).
 */
export function wireSolveButton({ button, animArea, h = DEFAULTS.h,
                                  solveLabel = 'Solve', resetLabel = 'Reset' }) {
    let paddedPuzzle = '';
    let paddedSolution = null;
    let solved = false;

    function render() {
        animArea.innerHTML = paddedPuzzle ? equationAnimatableSvg(paddedPuzzle, h) : '';
        button.textContent = solveLabel;
        button.disabled = !paddedSolution;
        solved = false;
    }

    function setPuzzle(puzzle, ruleset, preferred) {
        paddedPuzzle = padPuzzle(puzzle);
        paddedSolution = findFirstSolution(puzzle, ruleset, preferred);
        render();
    }

    button.addEventListener('click', () => {
        if (!paddedSolution) return;
        if (solved) { render(); return; }
        button.disabled = true;
        const svg = animArea.querySelector('svg.equation-anim');
        animateSolve(svg, paddedPuzzle, paddedSolution).then(() => {
            button.textContent = resetLabel;
            button.disabled = false;
            solved = true;
        });
    });

    return { setPuzzle };
}
