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
Given a question and the student's answer, respond ONLY with a JSON object (no markdown fences, no preamble) with exactly these fields:
{
  "gradeNote": "one short encouraging line, e.g. 'Close — here's where it slipped.' or 'Nice work — small refinement below.'",
  "misconception": "1-2 sentences naming the likely misconception or error pattern, or 'No significant error found.' if the answer is correct",
  "fix": "2-4 sentences explaining the correct reasoning/steps tailored to this exact question and answer",
  "memoryTip": "1 short sentence, a general study/memory technique relevant to this mistake",
  "nextStep": "1 short sentence suggesting a concrete next action"
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
      return res.status(502).json({ error: 'The AI service returned an error.' });
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
