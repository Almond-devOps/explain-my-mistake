// ---------------------------------------------------
// Explain My Mistake — fully client-side grading engine.
// No server, no API key, no network call. Arithmetic and
// simple linear-equation questions are actually solved and
// checked. Anything it can't confidently parse gets an honest
// "can't verify this automatically" response instead of a
// fabricated-sounding one.
// ---------------------------------------------------

const qEl = document.getElementById('q');
const aEl = document.getElementById('a');
const outEl = document.getElementById('out');
const goEl = document.getElementById('go');
const goLabel = document.getElementById('goLabel');
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');

function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ---------------------------------------------------
// Safe arithmetic expression evaluator (+ - * / ^ (), decimals, negatives)
// Hand-written recursive-descent parser — no eval().
// ---------------------------------------------------
function evalExpression(expr){
  let i = 0;
  const s = expr.replace(/\s+/g, '');

  function peek(){ return s[i]; }
  function consume(){ return s[i++]; }

  function parseNumber(){
    let start = i;
    if(peek() === '-') consume();
    while(/[0-9.]/.test(peek() || '')) consume();
    const numStr = s.slice(start, i);
    if(numStr === '' || numStr === '-') throw new Error('bad number');
    return parseFloat(numStr);
  }

  function parseFactor(){
    if(peek() === '('){
      consume();
      const v = parseExpr();
      if(peek() !== ')') throw new Error('missing )');
      consume();
      return v;
    }
    if(peek() === '-'){
      consume();
      return -parseFactor();
    }
    return parseNumber();
  }

  function parsePow(){
    let base = parseFactor();
    if(peek() === '^'){
      consume();
      const exp = parsePow();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseTerm(){
    let v = parsePow();
    while(peek() === '*' || peek() === '/'){
      const op = consume();
      const rhs = parsePow();
      v = op === '*' ? v * rhs : v / rhs;
    }
    return v;
  }

  function parseExpr(){
    let v = parseTerm();
    while(peek() === '+' || peek() === '-'){
      const op = consume();
      const rhs = parseTerm();
      v = op === '+' ? v + rhs : v - rhs;
    }
    return v;
  }

  const result = parseExpr();
  if(i !== s.length) throw new Error('leftover input');
  if(!isFinite(result)) throw new Error('non-finite result');
  return result;
}

function fmt(n){
  const rounded = Math.round(n * 1e6) / 1e6;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

// ---------------------------------------------------
// Try to interpret the question as something solvable.
// Returns { kind, correctValue, ... } or null.
// ---------------------------------------------------
function analyzeQuestion(question){
  const q = question.trim();

  // Pure arithmetic expression somewhere in the text
  const exprMatch = q.match(/-?\(?\s*-?\d+(\.\d+)?\s*(\)?\s*[+\-*/^]\s*\(?\s*-?\d+(\.\d+)?\s*\)?\s*)+/);
  if(exprMatch){
    const raw = exprMatch[0];
    try {
      const value = evalExpression(raw);
      return {
        kind: 'arithmetic',
        expression: raw,
        correctValue: value
      };
    } catch(e){ /* fall through */ }
  }

  // Linear equation: [coef]x [+-] [const] = const  (also handles "solve for x:" prefix)
  const eqMatch = q.match(/(-?\d*\.?\d*)\s*x\s*([+\-]\s*\d+\.?\d*)?\s*=\s*(-?\d+\.?\d*)/i);
  if(eqMatch){
    let [, coefRaw, addRaw, rhsRaw] = eqMatch;
    const coef = coefRaw === '' || coefRaw === '-' ? (coefRaw === '-' ? -1 : 1) : parseFloat(coefRaw);
    const add = addRaw ? parseFloat(addRaw.replace(/\s+/g, '')) : 0;
    const rhs = parseFloat(rhsRaw);
    if(coef !== 0){
      const x = (rhs - add) / coef;
      return {
        kind: 'linear',
        coef, add, rhs,
        correctValue: x
      };
    }
  }

  // Percentage: "X% of Y"
  const pctMatch = q.match(/(-?\d+\.?\d*)\s*%\s*of\s*(-?\d+\.?\d*)/i);
  if(pctMatch){
    const pct = parseFloat(pctMatch[1]);
    const base = parseFloat(pctMatch[2]);
    return {
      kind: 'percentage',
      pct, base,
      correctValue: (pct / 100) * base
    };
  }

  return null;
}

function extractNumber(answer){
  const m = answer.match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : null;
}

const checkSVG = `<svg class="grade-mark" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M9.5 16.5 L14 21 L23 10.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function block(title, body){
  return `<div class="grade-block"><h4>${escapeHTML(title)}</h4><p>${body}</p></div>`;
}

function renderResult(question, answer){
  const analysis = analyzeQuestion(question);
  const givenNum = extractNumber(answer);

  // Can't confidently parse this as math — be honest, not fabricated.
  if(!analysis || givenNum === null){
    return `
      <div class="grade-wrap">
        <div class="grade-head">
          ${checkSVG}
          <p class="grade-note">Can't auto-check this one.</p>
        </div>
        ${block('Question', escapeHTML(question))}
        ${block('Your answer', escapeHTML(answer))}
        ${block('Why', "This offline checker can verify arithmetic (like <code>12 / 4 + 3</code>), simple linear equations (like <code>2x + 4 = 12</code>), and percentages (like <code>20% of 50</code>). This question doesn't clearly match one of those patterns, so it can't be graded automatically without guessing.")}
        ${block('What you can do', "Rephrase it as a direct calculation or a solve-for-x equation and try again — or work through it against a textbook or teacher for anything more conceptual than arithmetic.")}
      </div>
    `;
  }

  const correctValue = analysis.correctValue;
  const isCorrect = Math.abs(correctValue - givenNum) < 1e-6;
  const diff = givenNum - correctValue;

  let stepsHTML = '';
  let memoryTip = '';

  if(analysis.kind === 'arithmetic'){
    stepsHTML = `<code>${escapeHTML(analysis.expression)}</code> evaluates to <strong>${fmt(correctValue)}</strong>, following the standard order of operations (parentheses, then powers, then multiplication/division left to right, then addition/subtraction left to right).`;
    memoryTip = 'Work multi-step arithmetic left to right in passes — all the multiplication/division first, then all the addition/subtraction — rather than strictly left to right across different operations.';
  } else if(analysis.kind === 'linear'){
    const coefStr = analysis.coef === 1 ? '' : (analysis.coef === -1 ? '-' : fmt(analysis.coef));
    stepsHTML = `Starting from <code>${coefStr}x ${analysis.add >= 0 ? '+' : '-'} ${fmt(Math.abs(analysis.add))} = ${fmt(analysis.rhs)}</code>: subtract ${fmt(analysis.add)} from both sides to get <code>${coefStr || '1'}x = ${fmt(analysis.rhs - analysis.add)}</code>, then divide both sides by ${fmt(analysis.coef)} to get <code>x = ${fmt(correctValue)}</code>.`;
    memoryTip = 'Undo operations in reverse order — addition/subtraction first, multiplication/division last — to isolate x cleanly.';
  } else if(analysis.kind === 'percentage'){
    stepsHTML = `${fmt(analysis.pct)}% of ${fmt(analysis.base)} means <code>${fmt(analysis.pct)} / 100 &times; ${fmt(analysis.base)}</code>, which is <strong>${fmt(correctValue)}</strong>.`;
    memoryTip = 'Convert the percentage to a decimal first (divide by 100), then multiply — keeps the two steps from getting tangled.';
  }

  return `
    <div class="grade-wrap ${isCorrect ? 'is-correct' : ''}">
      <div class="grade-head">
        ${checkSVG}
        <p class="grade-note">${isCorrect ? "Nailed it." : "Close — here's where it slipped."}</p>
      </div>
      ${block('Question', escapeHTML(question))}
      ${block('Your answer', escapeHTML(answer))}
      ${block(isCorrect ? 'Why it works' : 'What the correct working looks like', stepsHTML)}
      ${!isCorrect ? block('The gap', `Your answer is off by ${fmt(Math.abs(diff))} from the correct value of ${fmt(correctValue)}.`) : ''}
      ${block('Memory tip', escapeHTML(memoryTip))}
      ${block('Try this next', 'Change one number in the same question and solve it again from scratch before checking.')}
    </div>
  `;
}

function handleSubmit(){
  const question = qEl.value.trim();
  const answer = aEl.value.trim();

  if(!question || !answer){
    outEl.innerHTML = `<p class="out warning">Add both the question and your answer first.</p>`;
    return;
  }

  outEl.innerHTML = renderResult(question, answer);
  outEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

goEl.addEventListener('click', handleSubmit);

[qEl, aEl].forEach(el => {
  el.addEventListener('keydown', (e) => {
    if((e.metaKey || e.ctrlKey) && e.key === 'Enter'){
      e.preventDefault();
      handleSubmit();
    }
  });
});

// ---------------------------------------------------
// Mobile nav toggle
// ---------------------------------------------------
navToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

// ---------------------------------------------------
// Scroll reveal
// ---------------------------------------------------
const revealEls = document.querySelectorAll('.reveal');

if('IntersectionObserver' in window && revealEls.length){
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in-view'));
}
