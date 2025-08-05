// api/feedback.js
export default async function handler(req, res) {
  // CORS-Header für Frontend setzen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode nicht erlaubt" });
  }

  const { frame, methode = "", beratung = "", onlyFrame = false } = req.body || {};
  
  if (!frame || frame.trim().length === 0) {
    return res.status(400).json({
      frameFeedback: "Bitte geben Sie einen Experten-Frame ein.",
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }

  // Bewertungskriterien aus Ihrer PDF laden
  const evaluationCriteria = `
EXPERTENFRAME-BEWERTUNG

Bewerte basierend auf folgenden Muss-Anforderungen:

1. Länge: 500-800 Wörter
2. Storytelling statt oberflächlicher Aufzählung (1-3 detaillierte Stories)
3. Keine chronologische Erzählung des Werdegangs
4. Begründung der Expertise mit Experten-Merkmalen
5. Natürlicher Gesprächston (gesprochenes Wort)
6. Integration negativer Erfahrungen/Learnings
7. Professionelle Tonalität ohne Romantisierung
8. Keine überflüssigen Frames oder Ankündigungen

Format der Antwort als JSON:
{
  "frameFeedback": "EXPERTENFRAME-BEWERTUNG\\nWortanzahl: [X] Wörter\\n\\nErfüllte Anforderungen:\\n✅ [Liste]\\n\\nNicht erfüllte Anforderungen:\\n❌ [Details]",
  "methodeFeedback": "...",
  "beratungFeedback": "..."
}
`;

  const systemMsg = `Du bist ein Bewertungsassistent für Hochzeitsdienstleister-Beratungen. 
Antworte immer als strikt gültiges JSON ohne zusätzlichen Text außerhalb des JSON-Objekts.
${evaluationCriteria}`;

  const userMsg = `
Bewerte den folgenden Beratungstext gemäß den definierten Kriterien:

🧠 Experten-Frame:
${frame}

${!onlyFrame ? `🛠 Methode:
${methode}

💬 Beratung:
${beratung}` : ''}

onlyFrame=${onlyFrame}

Antworte ausschließlich als JSON-Objekt.
`.trim();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022", // Aktualisiert auf neueres Modell
        max_tokens: 2000,
        system: systemMsg,
        messages: [{ role: "user", content: userMsg }]
      })
    });

    const rawText = await response.text();
    
    console.log("Claude HTTP:", response.status, response.statusText);
    console.log("Claude Antwort:", rawText.substring(0, 500) + "...");

    if (!response.ok) {
      let errorMessage = `Claude API Fehler (${response.status})`;
      try {
        const errorData = JSON.parse(rawText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = rawText.substring(0, 200);
      }
      
      return res.status(response.status).json({
        frameFeedback: errorMessage,
        methodeFeedback: "",
        beratungFeedback: ""
      });
    }

    // Claude's JSON-Antwort parsen
    let parsed;
    try {
      const claudeResponse = JSON.parse(rawText);
      const content = claudeResponse.content?.[0]?.text || rawText;
      
      // Versuche JSON aus dem Inhalt zu extrahieren
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("JSON Parse Fehler:", parseError);
      return res.status(500).json({
        frameFeedback: "Fehler beim Parsen der Claude-Antwort. Versuchen Sie es erneut.",
        methodeFeedback: "",
        beratungFeedback: ""
      });
    }

    // Strukturierte Antwort zurückgeben
    return res.status(200).json({
      frameFeedback: parsed.frameFeedback || "Keine Bewertung erhalten.",
      methodeFeedback: onlyFrame ? "" : (parsed.methodeFeedback || ""),
      beratungFeedback: onlyFrame ? "" : (parsed.beratungFeedback || "")
    });

  } catch (error) {
    console.error("Server Fehler:", error);
    return res.status(500).json({
      frameFeedback: `Serverfehler: ${error.message}`,
      methodeFeedback: "",
      beratungFeedback: ""
    });
  }
}
