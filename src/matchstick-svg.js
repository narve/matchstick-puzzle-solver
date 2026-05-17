// Shared matchstick-SVG rendering used by index.html (via match.js) and media.html.
import { getRuleSets } from './match.js';

const VB_X = 2, VB_Y = 6;
export const VB_W = 48, VB_H = 86;

const USE = '<use href="#matchstick" width="60" height="200"/>';

// Stick metadata: every animatable stick is described by its position (tx,
// ty) and rotation. `key` is a stable identifier per physical stick slot,
// so the same key on two chars means "the same stick is here in both",
// enabling set-diff for animation: removed = puzzle-keys − solution-keys.
function metaH(x, y) { return { tx: x, ty: y + 6, rot: -90, key: `h${x},${y}` }; }
function metaV(x, y) { return { tx: x, ty: y,     rot: 0,   key: `v${x},${y}` }; }

const SEG = [
  metaH( 4,  19), // 0 top
  metaV( 4,  16), // 1 top-left
  metaV(36,  16), // 2 top-right
  metaH( 4,  56), // 3 middle
  metaV( 4,  50), // 4 bot-left
  metaV(36,  50), // 5 bot-right
  metaH( 4,  90), // 6 bottom
];

const CHAR_SEGS = {
  '0':[0,1,2,4,5,6], '1':[2,5],      '2':[0,2,3,4,6],
  '3':[0,2,3,5,6],   '4':[1,2,3,5],  '5':[0,1,3,5,6],
  '6':[0,1,3,4,5,6], '7':[0,2,5],    '8':[0,1,2,3,4,5,6],
  '9':[0,1,2,3,5,6], '-':[3],        ' ':[],
  // Alt forms: 5-segment 6 (no top) and 5-segment 9 (no bottom)
  'b':[1,3,4,5,6],   'q':[0,1,2,3,5],
};

// Operator chars composed of straight (animatable) sticks. Canonical
// reference: '-' = SEG[3]; '=' = stacked horizontals at y=48 and y=64.
// Alt forms — flexible ruleset only:
//   M alt '-': leftover bottom stick of '='
//   E alt '=': bottom at canonical '-' position
//   P alt '+': horizontal at canonical '=' top
const STRAIGHT_OP_SEGS = {
  '+': [metaH(4, 56), metaV(21.5, 35)],
  '=': [metaH(4, 48), metaH(4, 64)],
  'M': [metaH(4, 64)],
  'E': [metaH(4, 40), metaH(4, 56)],
  'P': [metaH(4, 48), metaV(21.5, 28)],
};

// Diagonal characters — rendered but excluded from animation diff.
const DIAG_SPECS = {
  '/': [{ cx: 27.5, cy: 56, angle:  45 }],
  '*': [{ cx: 27.5, cy: 56, angle:  45 }, { cx: 27.5, cy: 56, angle: -45 }],
};

function straightSegs(c) {
  if (CHAR_SEGS[c] !== undefined) return CHAR_SEGS[c].map(i => SEG[i]);
  if (STRAIGHT_OP_SEGS[c]) return STRAIGHT_OP_SEGS[c];
  return [];
}

function segSvg(s) {
  // rot=-90 → horizontal stick (origin offset by 6 in the y direction via metaH)
  // rot=0   → vertical stick
  return `<g transform="translate(${s.tx},${s.ty}) rotate(${s.rot}) scale(0.2)">${USE}</g>`;
}
function diagSvg(d) {
  return `<g transform="translate(${d.cx},${d.cy}) rotate(${d.angle}) translate(-6,-21) scale(0.2)">${USE}</g>`;
}

function charInner(c) {
  const segs = straightSegs(c).map(segSvg).join('');
  const diag = (DIAG_SPECS[c] ?? []).map(diagSvg).join('');
  return segs + diag;
}

const charIdSuffix = {
  '+': 'plus', '-': 'minus', '*': 'mul', '/': 'div',
  '=': 'eq',   ' ': 'space',
};
const idFor = c => `c-${charIdSuffix[c] ?? c}`;

const MATCHSTICK_SYMBOL = `
  <symbol id="matchstick" viewBox="0 0 60 200">
    <defs>
      <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#6b3a14"/>
        <stop offset="20%"  stop-color="#c8893a"/>
        <stop offset="50%"  stop-color="#ebbf72"/>
        <stop offset="80%"  stop-color="#c8893a"/>
        <stop offset="100%" stop-color="#6b3a14"/>
      </linearGradient>
      <filter id="woodGrain" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="1.1 0.035" numOctaves="5" seed="4" result="noise"/>
        <feColorMatrix type="saturate" values="0.25" in="noise" result="tinted"/>
        <feBlend in="SourceGraphic" in2="tinted" mode="multiply" result="blended"/>
        <feComposite in="blended" in2="SourceGraphic" operator="in"/>
      </filter>
      <radialGradient id="headGrad" cx="36%" cy="30%" r="62%" fx="36%" fy="30%">
        <stop offset="0%"   stop-color="#ff7878"/>
        <stop offset="38%"  stop-color="#cc1a1a"/>
        <stop offset="100%" stop-color="#540000"/>
      </radialGradient>
      <filter id="headTexture" x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence type="turbulence" baseFrequency="0.55" numOctaves="3" seed="9" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5"
                           xChannelSelector="R" yChannelSelector="G" result="rough"/>
        <feComposite in="rough" in2="SourceGraphic" operator="in"/>
      </filter>
    </defs>
    <rect x="23" y="40" width="14" height="155" rx="5" ry="5"
          fill="url(#woodGrad)" filter="url(#woodGrain)"/>
    <ellipse cx="30" cy="33" rx="13" ry="18"
             fill="url(#headGrad)" filter="url(#headTexture)"/>
    <ellipse cx="24" cy="24" rx="4" ry="5.5" fill="white" opacity="0.2"/>
  </symbol>`;

export function injectDefs(target = document.body) {
  if (document.getElementById('char-defs')) return;
  // Inject the union of legals across all rulesets so alt-form symbols
  // (e.g. b, q under flexible) exist regardless of which ruleset is active.
  const allLegals = new Set(getRuleSets().flatMap(r => r.legals));
  const charSymbols = [...allLegals].map(c =>
    `<symbol id="${idFor(c)}" viewBox="${VB_X} ${VB_Y} ${VB_W} ${VB_H}">${charInner(c)}</symbol>`
  ).join('');
  target.insertAdjacentHTML('beforeend',
    `<svg id="char-defs" style="position:absolute;width:0;height:0;overflow:hidden" xmlns="http://www.w3.org/2000/svg">${MATCHSTICK_SYMBOL}${charSymbols}</svg>`
  );
}

export function charSvg(c, w, h) {
  return `<svg viewBox="${VB_X} ${VB_Y} ${VB_W} ${VB_H}" width="${w}" height="${h}" `
       + `style="vertical-align:middle"><use href="#${idFor(c)}"/></svg>`;
}

export function equationSvg(text, h) {
  const w = Math.round(h * (VB_W / VB_H));
  return [...text].map(c => charSvg(c, w, h)).join('');
}

// ── Animation support ────────────────────────────────────────────────
// `charSegments(c)` returns the straight-stick metadata used to diff
// puzzle ↔ solution stick sets and drive the animation. '/' and '*' are
// diagonal-only and have no animatable metadata.
export function charSegments(c) {
  return straightSegs(c);
}

// Render one stick group at (tx, ty) with rotation `rot`. Wrapped in a
// single <g> whose `transform` attribute is mutated during animation.
function stickGroupSvg(seg, posIdx, xOffset) {
  return `<g class="seg" data-pos="${posIdx}" data-key="${seg.key}" `
       + `transform="translate(${seg.tx + xOffset},${seg.ty}) rotate(${seg.rot}) scale(0.2)">`
       + USE + `</g>`;
}

// Diagonals (in '/' and '*') render but don't participate in animation.
function diagStickSvg(d, posIdx, xOffset) {
  return `<g class="seg-static" data-pos="${posIdx}" `
       + `transform="translate(${d.cx + xOffset},${d.cy}) rotate(${d.angle}) translate(-6,-21) scale(0.2)">`
       + USE + `</g>`;
}

/**
 * Returns a single inline <svg> for the whole equation with every straight
 * stick as an addressable <g class="seg" data-pos data-key>. Diagonals
 * render as <g class="seg-static"> (no key — excluded from animation diff).
 */
export function equationAnimatableSvg(text, h) {
  const chars = [...text];
  const w = Math.round(h * (VB_W / VB_H));
  const totalW = chars.length * VB_W;
  const inner = chars.map((c, i) => {
    const xOff = i * VB_W;
    const straight = straightSegs(c).map(s => stickGroupSvg(s, i, xOff)).join('');
    const diag = (DIAG_SPECS[c] ?? []).map(d => diagStickSvg(d, i, xOff)).join('');
    return straight + diag;
  }).join('');
  return `<svg class="equation-anim" width="${w * chars.length}" height="${h}" `
       + `viewBox="${VB_X} ${VB_Y} ${totalW} ${VB_H}" `
       + `xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">`
       + inner + `</svg>`;
}

