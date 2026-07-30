// ---------------------------------------------------
// Explain My Mistake — interaction logic
// Calls the /api/analyze serverless function, which talks to the
// Claude API server-side (your API key never reaches the browser).
// See README.md for deployment setup.
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

const checkSVG = `<svg class="grade-mark" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M9.5 16.5 L14 21 L23 10.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function renderGrade(question, answer, result){
  const isCorrect = !!result.correct;
  return `
    <div class="grade-wrap ${isCorrect ? 'is-correct' : ''}">
      <div class="grade-head">
        ${checkSVG}
        <p class="grade-note">${escapeHTML(result.gradeNote || (isCorrect ? "Nailed it." : "Here's the breakdown."))}</p>
      </div>

      <div class="grade-block">
        <h4>Question</h4>
        <p>${escapeHTML(question)}</p>
      </div>

      <div class="grade-block">
        <h4>Your answer</h4>
        <p>${escapeHTML(answer)}</p>
      </div>

      <div class="grade-block highlight">
        <h4>${isCorrect ? "Why it works" : "Likely misconception"}</h4>
        <p>${escapeHTML(result.misconception)}</p>
      </div>

      <div class="grade-block">
        <h4>${isCorrect ? "Say it back, precisely" : "What the fix looks like"}</h4>
        <p>${escapeHTML(result.fix)}</p>
      </div>

      <div class="grade-block">
        <h4>Memory tip</h4>
        <p>${escapeHTML(result.memoryTip)}</p>
      </div>

      <div class="grade-block">
        <h4>Try this next</h4>
        <p>${escapeHTML(result.nextStep)}</p>
      </div>
    </div>
  `;
}

function showSkeleton(){
  outEl.innerHTML = `
    <div class="skeleton" aria-hidden="true">
      <div class="skeleton-line" style="width:40%"></div>
      <div class="skeleton-line" style="width:92%"></div>
      <div class="skeleton-line" style="width:78%"></div>
      <div class="skeleton-line" style="width:85%"></div>
    </div>
  `;
}

async function handleSubmit(){
  const question = qEl.value.trim();
  const answer = aEl.value.trim();

  if(!question || !answer){
    outEl.innerHTML = `<p class="out warning">Add both the question and your answer first.</p>`;
    return;
  }

  goEl.disabled = true;
  goEl.setAttribute('aria-busy', 'true');
  goEl.querySelector('.pen-icon').classList.add('spin');
  goLabel.textContent = 'Grading…';
  showSkeleton();

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer })
    });

    const result = await response.json();

    if(!response.ok){
      throw new Error(result.error || 'Something went wrong.');
    }

    outEl.innerHTML = renderGrade(question, answer, result);
    outEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    outEl.innerHTML = `<p class="out warning">${escapeHTML(err.message || 'Something went wrong. Please try again.')}</p>`;
  } finally {
    goEl.disabled = false;
    goEl.removeAttribute('aria-busy');
    goEl.querySelector('.pen-icon').classList.remove('spin');
    goLabel.textContent = 'Explain my mistake';
  }
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
