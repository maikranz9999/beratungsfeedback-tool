// api/feedback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { frame } = req.body;

  const prompt = `
Du bewertest den folgenden Text, genannt „Expertenframe“, nach festen Kriterien für ein Beratungsgespräch mit Hochzeitsdienstleistern. 

Antworte ausschließlich in folgendem JSON-Format:

{
  "frameFeedback": "Konkretes, wohlwollendes Feedback zum Expertenframe.",
  "methodeFeedback": "",
  "beratungFeedback": ""
}

Bewerte die folgenden Kriterien:
- Länge (500–800 Wörter)
- Storytelling statt Aufzählung
- keine chronologische Biografie
- Experten-Merkmale (klare Meinung, Gamechanger-Strategien etc.)
- natürlicher Ton (wie gesprochen)
- auch negative Erfahrungen enthalten
- keine Romantisierung
- keine überflüssigen Einleitungen

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

    const raw = data?.content?.[0]?.text;
    if (!raw) {
      return res.status(500).json({
        frameFeedback: "Claude hat keine Antwort geliefert.",
        methodeFeedback: "",
        beratungFeedback: ""
      });
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({
        frameFeedback: "Claude hat kein gültiges JSON geliefert.",
        methodeFeedback: "",
        beratungFeedback: ""
      });
    }

    const parsed = JSON.parse(match[0]);

    res.status(200).json({
      frameFeedback: parsed.frameFeedback || "Keine Rückmeldung.",
      methodeFeedback: parsed.methodeFeedback || "",
      beratungFeedback: parsed.beratungFeedback || ""
    });
  } catch (error) {
    console.error("Claude API Fehler:", error);
    res.status(500).json({
      frameFeedback: "Fehler bei der Verarbeitung: " + error.message,
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }
}
