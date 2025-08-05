// api/feedback.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { frame, methode, beratung, onlyFrame } = req.body;

  const prompt = `...` // Claude-Prompt wie oben beschrieben, am besten mit `${frame}` am Ende

  const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.CLAUDE_API_KEY,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await apiResponse.json();
  const match = data.content[0].text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match[0]);

  res.status(200).json({
    frameFeedback: parsed.frameFeedback || '',
    methodeFeedback: parsed.methodeFeedback || '',
    beratungFeedback: parsed.beratungFeedback || ''
  });
}
