
// *********** RULES ****

// const legals = "0123456789+-x/= ".split("");
const legals = "0123456789+-= ".split("");

const adds  = {};
const subs  = {};
const trans = {};

function add(c1, c2) {
    adds[c1].add(c2);
    subs[c2].add(c1);
}

function transform(c1,c2) {
    trans[c1].add(c2);
    trans[c2].add(c1);
}

function makeRules() {
    legals.forEach( c => adds[c] = new Set() );
    legals.forEach( c => subs[c] = new Set() );
    legals.forEach( c => trans[c] = new Set() );
    add( '-', '+');
    add( '-', '=');
    add('1', '7');
    add('5', '6');
    add('0', '8');
    add('6', '8');
    add('5','9');
    transform('3', '5');
    transform('3', '2');
    transform('5', '9');
}

function evaluate(arr) {
    try {
        if( arr.indexOf( '=') <= -1 ) return false;
        return !!eval(arr.join("").replace('=', '=='));
    } catch (x) {
        return false;
    }
}


// *********** SOLVING ****


function mutate(arr) {
    return transforms(arr).concat(moves(arr));
}

function replace( arr, index, re) {
    const res = [...arr];
    res[index] = re;
    return res;
}

function transforms(arr) {
    const res = [];
    for(let i = 0; i < arr.length; i++ ) {
        const c = arr[i];
        trans[c].forEach( t => res.push( replace(arr, i, t)));
    }
    return res;
}

function moves(arr) {
    const res = [];
    for(let i = 0; i < arr.length; i++ ) {
        const c = arr[i];
        subs[c].forEach( re => res.push( ... adding( replace(arr, i, re ), i)));
    }
    return res;
}

function adding(arr, except) {
    const res = [];
    for( let i = 0; i < arr.length; i++ ) {
        if( i === except ) continue;
        const c = arr[i];
        adds[c].forEach( re => res.push( replace(arr, i, re)));
    }
    return res;
}




// *********** UI ****


function element(tag, txt, subs = []) {
    const e = document.createElement(tag);
    e.appendChild(document.createTextNode(txt));
    subs.forEach(s => e.appendChild(s));
    return e;
}


function toLink(txt) {
    const li = document.createElement( 'li');
    li.innerHTML = txt;
    makeLink(li);
    return li;
}


function makeLink(element) {
    element.addEventListener('click', e => putSample(e.srcElement.innerHTML));
}

function putSample(txt) {
    console.log( "putting sample: ", txt);
    document.querySelector("#equation").value = txt;
    solve();
}

function solve() {
    const t = document.querySelector("#equation").value;

    const mutations = mutate(t.split(""));
    const solutions = mutations.filter(arr => evaluate(arr))
        .map( m => m.join(""))
        .map( toLink );
    const other = mutations.filter(arr => !evaluate(arr))
        .map( m => m.join(""))
        .map( toLink );

    const statusElement = document.querySelector("#status");
    statusElement.innerHTML = '';

    // statusElement.appendChild(element('p', `Equation: ${t} evaluates to ${evaluate(t.split(""))}`));

    const isOK = evaluate(t.split(""));

    if( !isOK && solutions.length > 0) {
        statusElement.appendChild(element('p', `${solutions.length} solution(s): `));
        statusElement.appendChild( element( 'ul', "", solutions));
    }

    statusElement.appendChild(element('p', `${other.length} ${isOK ? 'Possible quiz tasks: ' : 'Other incorrect mutations: '}`));
    statusElement.appendChild( element( 'ul', "", other));
}

function setup() {

    makeRules();

    document.querySelector("#equation").addEventListener('input', () => solve());
    document.querySelector(".samples").childNodes.forEach( e => makeLink(e));

    const span = set => element( 'span', [...set].join(""));

    for( let i = 0; i < legals.length; i++ ) {
        const c = legals[i];
        const o = element( 'th', c );
        const t = element( 'td',"", [span(trans[c])] );
        const a = element( 'td',"", [span(adds[c])] );
        const s = element( 'td',"", [span(subs[c])] );
        document.querySelector('tbody').appendChild( element( 'tr', "", [o, t, a, s]));
    }

    document.querySelector("#equation").value = document.querySelector(".samples").firstElementChild.innerHTML;
    solve();
}