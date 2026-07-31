# Explain My Mistake

A one-page tool: paste a question and the answer you gave, and it checks the
math right there in your browser — no server, no API key, no account, no
billing.

## How it works

`script.js` contains a small hand-written evaluator that actually solves:

- **Arithmetic** — e.g. `12 / 4 + 3`, `2 * (5 - 1)`
- **Simple linear equations** — e.g. `2x + 4 = 12`, `solve for x: 3x - 6 = 9`
- **Percentages** — e.g. `20% of 50`

It compares your answer to the real computed value and explains the correct
steps either way. If a question doesn't match one of those patterns, it says
so honestly rather than guessing — this app doesn't have general reading
comprehension, only arithmetic.

## Running it

There's nothing to deploy or configure. Open `index.html` directly in a
browser, or host the three files (`index.html`, `style.css`, `script.js`)
on absolutely any static host:

- Drag the folder into **Netlify Drop** (app.netlify.com/drop) — instant URL
- **GitHub Pages** — push to a repo, enable Pages in Settings
- **Vercel** — import the repo, no configuration needed (no env vars, no
  serverless functions)

All three work identically since it's plain HTML/CSS/JS with no build step
and no backend.

## Extending it

To cover more question types, add another pattern branch inside
`analyzeQuestion()` in `script.js` — follow the shape of the existing
`arithmetic` / `linear` / `percentage` cases (match the question text,
compute the correct value, return a `kind` so `renderResult()` knows how to
explain it).

## Files

- `index.html` — markup, links `style.css` and `script.js`
- `style.css` — all styling
- `script.js` — the grading engine and all interaction logic
