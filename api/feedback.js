// api/feedback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { frame } = req.body;

  const prompt = `
Antworte ausschließlich im folgenden JSON-Format:

{
  "frameFeedback": "Dein Feedback zum Expertenframe.",
  "methodeFeedback": "",
  "beratungFeedback": ""
}

Hier ist der Expertenframe:
====================
${frame}
====================
`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await response.json();

    // Debug-Ausgabe zur Sicherheit
    console.log("Claude-Antwort:", JSON.stringify(data, null, 2));

    const text = data?.content?.[0]?.text || "";

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({
        frameFeedback: "Claude hat kein gültiges JSON geliefert.",
        methodeFeedback: "",
        beratungFeedback: ""
      });
    }

    const parsed = JSON.parse(match[0]);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Claude API Fehler:", error);
    return res.status(500).json({
      frameFeedback: "Fehler bei der Verarbeitung: " + error.message,
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }
}
