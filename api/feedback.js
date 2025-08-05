// api/feedback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { frame, methode, beratung, onlyFrame } = req.body;

  const prompt = `
Du bewertest den „Expertenframe“-Abschnitt eines Beratungsgesprächs für Hochzeitsdienstleister.
Jede Anforderung ist eine Muss-Anforderung. Gib für jede nicht erfüllte Anforderung spezifisches Feedback im JSON-Format.

====================
${frame}
====================
`;

  try {
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

    const match = data?.content?.[0]?.text?.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        frameFeedback: "Claude hat kein gültiges JSON geliefert.",
        methodeFeedback: "",
        beratungFeedback: ""
      });
    }

    const parsed = JSON.parse(match[0]);

    res.status(200).json({
      frameFeedback: parsed.frameFeedback || "Kein Feedback.",
      methodeFeedback: parsed.methodeFeedback || "",
      beratungFeedback: parsed.beratungFeedback || ""
    });
  } catch (err) {
    console.error("Claude API Fehler:", err);
    res.status(500).json({
      frameFeedback: "Fehler bei der Bewertung: " + err.message,
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }
}
