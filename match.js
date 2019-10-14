// *********** RULES ****

const legals = "0123456789+-*/= ".split("");
// const legals = "1234567890+-= ".split("");

const adds = {};
const subs = {};
const trans = {};

function add(c1, c2) {
    adds[c1].add(c2);
    subs[c2].add(c1);
}

function transform(c1, c2) {
    trans[c1].add(c2);
    trans[c2].add(c1);
}

function makeRules() {
    legals.forEach( c => [adds, subs, trans].forEach( s => s[c] = new Set()));
    add('-', '+');
    add('-', '=');
    add('0', '8');
    add('1', '7');
    add('3', '9');
    add('4', '9');
    add('5', '9');
    add('5', '6');
    add('6', '8');
    add('6', '9');
    add('9', '8');

    transform('3', '5');
    transform('3', '2');
    transform('6', '9');

    add(' ', '1');
}

function evaluate(arr) {
    if (arr.indexOf('=') <= -1) return false;
    try {
        return !!eval(" " + arr.join("").replace('=', '==').replace('x', '*') + " ");
    } catch (x) {
        return false;
    }
}


// *********** SOLVING ****


function mutate(arr) {
    return transforms([' ', ...arr, ' ']).concat(moves(arr));
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


//

// *********** Tests ****


function assert( exp, expSolutions, expOther ) {
    const mutations = mutate(exp.split(""));
    const solutions = mutations.filter(evaluate);
    const other = mutations.filter(e => !evaluate(e));
    if( solutions.length !== expSolutions) {
        // throw new Error( `exp=${exp}, expSolutions= ${expSolutions}, got ${solutions.length}`)
        const sol = solutions.map(s => s.join('')).join(';');
        console.error( new Error( `exp=${exp}, expSolutions= ${expSolutions}, got ${solutions.length}: ${sol}`));
    }
    if( other.length !== expOther) {
        // throw new Error( `exp=${exp}, expOther= ${expOther}, got ${other.length}`)
    }
}

const testData = [
    ['8+3-4=0', 2, 15],
    ['10+10=8', 1, 15],
    ['6-5=17', 1, 18],
    ['5+7=2', 1, 8 ],
    ['6+4=4', 2, 1] ,
    ['3+3=8', 2, 2] ,
    ['4-1=5', 1, 6 ],
    ['5+3=6', 2, 10],
    ['6-2=7', 2, 8],
    ['7+1=0', 1, 5 ],

    ['1111=11 ', 2, 5 ],

    ['1*3=5', 2, 5 ],
    ['5/3=1', 2, 5 ],
    ['7*5/3=2', 1, 5 ],
];

function runTests() {
    testData.forEach( data => assert( ...data ));
}



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

function setup() {

    makeRules();
    runTests();


    // Set up gui stuff:
    document.querySelector("#equation").addEventListener('input', e => solve(e.srcElement.value));
    const samples = document.querySelector("#samples");
    testData.forEach( data => samples.appendChild(toLink(data[0])));
    putSample(testData[0][0]);


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
