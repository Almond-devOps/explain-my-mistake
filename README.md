# Explain My Mistake

A one-page tool that grades a student's answer and explains the mistake, powered by the Claude API.

## How it's wired

- `index.html` / `style.css` — the graded-exam-paper themed UI.
- `script.js` — sends `{ question, answer }` to `/api/analyze` and renders the result.
- `api/analyze.js` — a **Vercel serverless function**. This is where the Claude API key actually lives. It never touches the browser.

This split matters: it's a static site, and anything in `script.js` is visible to anyone who opens dev tools. A raw API key can't go there — it has to sit server-side, which is what `api/analyze.js` is for.

## Deploy on Vercel (recommended)

1. Push this folder to a GitHub repo.
2. Go to vercel.com → **New Project** → import that repo. No build settings needed — it's picked up as a static site with one serverless function.
3. In the project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Deploy. Vercel will serve `index.html` at the root and automatically expose `api/analyze.js` at `/api/analyze`.
5. Open the deployed URL, enter a question + answer, and it should return a real graded response.

## Local testing

```
npm i -g vercel
vercel dev
```

This runs both the static files and the `/api/analyze` function locally (it'll prompt you to link the project and pull env vars, or you can create a `.env` file with `ANTHROPIC_API_KEY=...`).

## GitHub Pages

GitHub Pages only serves static files — it can't run `api/analyze.js`, and there's no safe way to call the Claude API directly from the browser with your key embedded. If you want to stick with GitHub Pages for hosting, you'd need to host `api/analyze.js` somewhere else that can run server code (Vercel, Cloudflare Workers, Netlify Functions, etc.) and point `script.js`'s fetch URL at that instead of `/api/analyze`.

## Swapping providers

`api/analyze.js` calls `https://api.anthropic.com/v1/messages`. To use OpenAI or Gemini instead, swap the `fetch` URL, headers, and request body in that one file to match their API — `script.js` doesn't need to change, since it just talks to `/api/analyze`.
