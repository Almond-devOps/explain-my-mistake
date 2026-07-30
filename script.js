// ---------------------------------------------------
// Explain My Mistake — interaction logic
// Calls the /api/analyze serverless function, which talks to the
// Claude API server-side. See README.md for deployment setup.
// ---------------------------------------------------

const qEl = document.getElementById('q');
const aEl = document.getElementById('a');
const outEl = document.getElementById('out');
const goEl = document.getElementById('go');

function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function buildAnalysis(question, answer, result){
  return `
    <div class="grade-wrap">
      <div class="grade-head">
        <svg class="grade-mark" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M9.5 16.5 L14 21 L23 10.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="grade-note">${escapeHTML(result.gradeNote || "Here's the breakdown.")}</p>
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
        <h4>Likely misconception</h4>
        <p>${escapeHTML(result.misconception || '')}</p>
      </div>

      <div class="grade-block">
        <h4>What the fix looks like</h4>
        <p>${escapeHTML(result.fix || '')}</p>
      </div>

      <div class="grade-block">
        <h4>Memory tip</h4>
        <p>${escapeHTML(result.memoryTip || '')}</p>
      </div>

      <div class="grade-block">
        <h4>Try this next</h4>
        <p>${escapeHTML(result.nextStep || '')}</p>
      </div>
    </div>
  `;
}

goEl.addEventListener('click', async () => {
  const question = qEl.value.trim();
  const answer = aEl.value.trim();

  if(!question || !answer){
    outEl.innerHTML = `<p class="out warning">Add both the question and your answer first.</p>`;
    return;
  }

  goEl.disabled = true;
  outEl.innerHTML = `<p class="out loading">Grading your answer…</p>`;
  outEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

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

    outEl.innerHTML = buildAnalysis(question, answer, result);
  } catch (err) {
    outEl.innerHTML = `<p class="out warning">${escapeHTML(err.message || 'Something went wrong. Please try again.')}</p>`;
  } finally {
    goEl.disabled = false;
  }
});

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
