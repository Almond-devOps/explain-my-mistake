// Temporary diagnostic endpoint.
// Reports only whether ANTHROPIC_API_KEY is present and roughly how long it is —
// never the value itself. Visit /api/check-env after deploying to confirm the
// environment variable actually reached this deployment.
// Delete this file once you've confirmed things work — no need to leave a
// diagnostic endpoint live permanently.

export default function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  return res.status(200).json({
    keyIsSet: !!key,
    keyLength: key ? key.length : 0,
    keyStartsWith: key ? key.slice(0, 7) : null,
    deployedAt: new Date().toISOString()
  });
}
