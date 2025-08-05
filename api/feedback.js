// api/feedback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { frame } = req.body;

  const prompt = `
Du bist ein Business-Coach für Hochzeitsdienstleister. 
Bewerte den folgenden Text, genannt „Expertenframe“, nach festen Kriterien. 
Antworte im folgenden JSON-Format:

{
  "frameFeedback": "konkretes Feedback zum Expertenframe",
  "methodeFeedback": "",
  "beratungFeedback": ""
}

Kriterien:
- Ist der Text 500–800 Wörter lang?
- Wird mit Storytelling gearbeitet statt reiner Aufzählung?
- Werden einzelne Erfahrungen statt chronologischer Lebenslauf erzählt?
- Werden echte Expertenmerkmale sichtbar? (klare Meinung, Gamechanger-Strategien etc.)
- Ist der Stil gesprochene Sprache?
- Werden auch negative Erfahrungen geteilt?
- Wird die eigene Arbeit nicht romantisiert?
- Gibt es unnötige Einleitungen („ich erzähl mal etwas von mir“)?

Hier ist der Text:
====================
${frame}
====================
`;

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await claudeRes.json();
    const raw = data?.content?.[0]?.text || "";

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
    console.error("API-Fehler:", error);
    res.status(500).json({
      frameFeedback: "Fehler bei der Verarbeitung: " + error.message,
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }
}
