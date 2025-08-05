// api/feedback.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { frame, methode = "", beratung = "", onlyFrame = false } = req.body || {};

  const systemMsg = "Du bist ein Bewertungsassistent. Antworte immer als strikt gültiges JSON mit den Schlüsseln frameFeedback, methodeFeedback, beratungFeedback – ohne Zusatztext.";

  const userMsg = `
Bewerte den folgenden Beratungstext. Antworte ausschließlich als JSON:
{
  "frameFeedback": "...",
  "methodeFeedback": "...",
  "beratungFeedback": "..."
}
Wenn onlyFrame=true, fülle nur frameFeedback.

🧠 Experten-Frame:
${frame}

🛠 Methode:
${methode}

💬 Beratung:
${beratung}

onlyFrame=${onlyFrame}
`.trim();

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,             // <-- muss exakt einzeilig gesetzt sein
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",                 // <-- durch den in deiner Konsole gelisteten Namen ersetzen
        max_tokens: 1000,
        system: systemMsg,
        messages: [{ role: "user", content: userMsg }]
      })
    });

    const rawText = await claudeRes.text();

    // Debug ins Runtime-Log schreiben
    console.log("Claude HTTP:", claudeRes.status, claudeRes.statusText);
    console.log("Claude RAW:", rawText);

    if (!claudeRes.ok) {
      // Anthropic-Fehlerformate als JSON zurückgeben, statt zu crashen
      return res.status(claudeRes.status).json({
        frameFeedback: `Claude-Fehler (${claudeRes.status}): ${rawText}`,
        methodeFeedback: "",
        beratungFeedback: ""
      });
    }

    // Erfolgsfall: Antworten sind JSON-ähnlicher Text – direkt parsen
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Falls Claude Text um das JSON herum schreibt: JSON aus dem Text herausziehen
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        return res.status(500).json({
          frameFeedback: "Claude hat kein gültiges JSON geliefert.",
          methodeFeedback: "",
          beratungFeedback: ""
        });
      }
      parsed = JSON.parse(match[0]);
    }

    // Felder absichern
    return res.status(200).json({
      frameFeedback: parsed.frameFeedback || "",
      methodeFeedback: parsed.methodeFeedback || "",
      beratungFeedback: parsed.beratungFeedback || ""
    });
  } catch (err) {
    console.error("Serverfehler:", err);
    return res.status(500).json({
      frameFeedback: "Fehler bei der Verarbeitung: " + err.message,
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }
}
