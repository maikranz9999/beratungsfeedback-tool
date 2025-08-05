// api/feedback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { frame, methode, beratung, onlyFrame } = req.body;

  const prompt = `
Bewerte den folgenden Beratungstext nach festen Kriterien. Antworte ausschließlich im folgenden JSON-Format:

{
  "frameFeedback": "...",
  "methodeFeedback": "...",
  "beratungFeedback": "..."
}

Hier ist der Text:

🧠 Experten-Frame:
${frame}

🛠 Methode:
${methode}

💬 Beratung:
${beratung}

Wenn nurFrame=true, bewerte nur den Experten-Frame und lasse die anderen Felder leer.
`;

  try {
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        system: "Du bist ein Bewertungsassistent für Texte. Antworte immer im exakt gültigen JSON-Format. Niemals erklärende Texte davor oder danach.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await claudeResponse.json();
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
  } catch (err) {
    console.error("Claude API Fehler:", err);
    return res.status(500).json({
      frameFeedback: "Fehler bei der Verarbeitung: " + err.message,
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }
}
