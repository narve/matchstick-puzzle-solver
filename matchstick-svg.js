// Shared matchstick-SVG rendering used by index.html (via match.js) and media.html.
import { getRuleSets } from './match.js';

export const VB_X = 2, VB_Y = 6, VB_W = 48, VB_H = 86;

const USE = '<use href="#matchstick" width="60" height="200"/>';

function hSeg(x, y) {
  return `<g transform="translate(${x},${y + 6}) scale(0.2) rotate(-90)">${USE}</g>`;
}
function vSeg(x, y) {
  return `<g transform="translate(${x},${y}) scale(0.2)">${USE}</g>`;
}
function diagSeg(cx, cy, angle) {
  return `<g transform="translate(${cx},${cy}) rotate(${angle}) translate(-6,-21) scale(0.2)">${USE}</g>`;
}

const SEG = [
  [hSeg,  4,  19 ], // 0 top
  [vSeg,  4,  16 ], // 1 top-left
  [vSeg, 36,  16 ], // 2 top-right
  [hSeg,  4,  56 ], // 3 middle
  [vSeg,  4,  50 ], // 4 bot-left
  [vSeg, 36,  50 ], // 5 bot-right
  [hSeg,  4,  90 ], // 6 bottom
];

const CHAR_SEGS = {
  '0':[0,1,2,4,5,6], '1':[2,5],      '2':[0,2,3,4,6],
  '3':[0,2,3,5,6],   '4':[1,2,3,5],  '5':[0,1,3,5,6],
  '6':[0,1,3,4,5,6], '7':[0,2,5],    '8':[0,1,2,3,4,5,6],
  '9':[0,1,2,3,5,6], '-':[3],        ' ':[],
};

function charInner(c) {
  if (CHAR_SEGS[c] !== undefined)
    return CHAR_SEGS[c].map(i => SEG[i][0](SEG[i][1], SEG[i][2])).join('');
  if (c === '+') return hSeg(4, 56) + vSeg(21.5, 35);
  if (c === '=') return hSeg(4, 48) + hSeg(4, 64);
  if (c === '/') return diagSeg(27.5, 56, 45);
  if (c === '*') return diagSeg(27.5, 56, 45) + diagSeg(27.5, 56, -45);
  return '';
}

const charIdSuffix = {
  '+': 'plus', '-': 'minus', '*': 'mul', '/': 'div',
  '=': 'eq',   ' ': 'space',
};
export const idFor = c => `c-${charIdSuffix[c] ?? c}`;

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
  const { legals } = getRuleSets().find(r => r.name === "default");
  const charSymbols = legals.map(c =>
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
