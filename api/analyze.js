// Vercel serverless function.
// Runs server-side only — the API key never reaches the browser.
// Deployed automatically at /api/analyze when this repo is deployed on Vercel.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, answer } = req.body || {};

  if (!question || !answer || typeof question !== 'string' || typeof answer !== 'string') {
    return res.status(400).json({ error: 'Both question and answer are required.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
  }

  const systemPrompt = `You are grading a student's answer for a study tool called "Explain My Mistake".
Given a question and the student's answer, decide whether the answer is correct, then respond ONLY with a JSON object (no markdown fences, no preamble) with exactly these fields:
{
  "correct": true or false,
  "gradeNote": "one short reaction line, e.g. 'Close — here's where it slipped.' or 'Nailed it.'",
  "misconception": "if incorrect, 1-2 sentences naming the likely misconception or error pattern; if correct, 1-2 sentences on the key idea they applied correctly",
  "fix": "if incorrect, 2-4 sentences explaining the correct reasoning/steps tailored to this exact question and answer; if correct, a precise restatement of why the reasoning holds",
  "memoryTip": "1 short sentence, a concrete way to remember this",
  "nextStep": "1 short sentence suggesting a concrete next action or follow-up exercise"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 600,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Question: ${question}\n\nStudent's answer: ${answer}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      // TEMPORARY: surfacing the raw error to the client for debugging.
      // Remove this line (and go back to a generic message) once things work —
      // don't leave provider error details exposed to end users permanently.
      return res.status(502).json({ error: 'The AI service returned an error.', debug: errText });
    }

    const data = await response.json();
    const textBlock = data.content?.find((block) => block.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse model output:', raw);
      return res.status(502).json({ error: 'Could not parse the AI response.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Request failed:', err);
    return res.status(500).json({ error: 'Something went wrong contacting the AI service.' });
  }
}
