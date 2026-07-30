# Explain My Mistake

A one-page tool: paste a question and the answer you gave, and it's graded
live by the Claude API — the misconception circled, and the reasoning that
gets you to the right answer.

## Why this needs a deployment step (not just opening index.html)

The browser can never safely hold your Anthropic API key — anything sent to
the page can be read by anyone who opens dev tools. So `script.js` doesn't
call Claude directly. It calls `/api/analyze`, a small serverless function
(`api/analyze.js`) that holds the key on the server and forwards the request.
Opening `index.html` straight from your file system will not work — it has
to be served, so `/api/analyze` exists as a real endpoint.

## Deploy it (Vercel — free, ~5 minutes)

1. **Get an API key**: create one at https://console.anthropic.com/settings/keys
   (you'll need a small amount of credit on the account — this app is cheap
   to run, a few hundred tokens per grading).
2. **Push this folder to a GitHub repo** (or use the Vercel CLI to skip GitHub
   entirely — see step 4).
3. **Import the repo on Vercel**: https://vercel.com/new → select the repo →
   click Deploy. No build settings needed, it's a static site + one function.
4. **Or skip GitHub with the CLI**:
   ```bash
   npm install -g vercel
   vercel
   ```
   from inside this folder, then follow the prompts.
5. **Add your API key as an environment variable**: in the Vercel dashboard,
   go to your project → Settings → Environment Variables → add
   `ANTHROPIC_API_KEY` with the key from step 1 → redeploy (Vercel will
   prompt you, or run `vercel --prod` again).
6. Visit the URL Vercel gives you. Try a real question and answer — the
   grading is now live.

## Other hosts

The only host-specific part is `api/analyze.js`, written as a Vercel
serverless function. Netlify and Cloudflare Pages both support the same
pattern (a function that reads `process.env.ANTHROPIC_API_KEY` and proxies
to `https://api.anthropic.com/v1/messages`) but expect the function in a
different folder and with a slightly different export shape — ask if you'd
like this adapted for one of those instead.

## Local development

```bash
npm install -g vercel
vercel dev
```
This runs both the static site and the `/api/analyze` function locally,
reading `ANTHROPIC_API_KEY` from a `.env` file in this folder (not committed
— add `.env` to `.gitignore`).

## Files

- `index.html` — markup only, links `style.css` and `script.js`
- `style.css` — all styling
- `script.js` — frontend logic, calls `/api/analyze`
- `api/analyze.js` — serverless function, the only place the API key lives
