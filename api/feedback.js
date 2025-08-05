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

  // Detaillierte Bewertungskriterien mit strukturiertem Feedback
  const evaluationCriteria = `
Du bewertest Experten-Frames basierend auf 8 Muss-Anforderungen. 

Für jede Anforderung erstellst du eine Bewertung:
- STATUS: ERFÜLLT / TEILWEISE / NICHT_ERFÜLLT
- BEGRÜNDUNG: Warum dieser Status?
- ZITATE: Konkrete Textstellen als Belege
- VERBESSERUNG: Was kann besser gemacht werden? (nur bei TEILWEISE/NICHT_ERFÜLLT)

Die 8 Anforderungen:

1. **Länge: 500-800 Wörter** 
2. **Storytelling statt oberflächlicher Aufzählung**
3. **Keine chronologische Erzählung des Werdegangs**
4. **Begründung der Expertise mit Experten-Merkmalen**
5. **Natürlicher Gesprächston (gesprochenes Wort)**
6. **Integration negativer Erfahrungen/Learnings**
7. **Professionelle Tonalität ohne Romantisierung**
8. **Keine überflüssigen Frames oder Ankündigungen**

WICHTIG: Antworte NUR mit einem JSON-Objekt, kein zusätzlicher Text!
`;

  const systemMsg = `Du bist ein Bewertungsassistent für Hochzeitsdienstleister-Beratungen. 
Antworte immer nur als gültiges JSON ohne zusätzlichen Text.
${evaluationCriteria}`;

  const userMsg = `
Bewerte den folgenden Experten-Frame nach den 8 Anforderungen.

🧠 Experten-Frame:
${frame}

${!onlyFrame ? `🛠 Methode:
${methode}

💬 Beratung:
${beratung}` : ''}

Bewerte jede Anforderung mit:
- STATUS: ERFÜLLT/TEILWEISE/NICHT_ERFÜLLT  
- BEGRÜNDUNG: Kurze Erklärung
- ZITATE: Relevante Textstellen
- VERBESSERUNG: Konkrete Tipps (bei TEILWEISE/NICHT_ERFÜLLT)

Antworte NUR als JSON:
{
  "frameFeedback": "Detaillierte strukturierte Bewertung aller 8 Anforderungen",
  "methodeFeedback": "",
  "beratungFeedback": ""
}
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
      
      // Claude gibt das JSON in einem verschachtelten Format zurück
      let content;
      if (claudeResponse.content && claudeResponse.content[0] && claudeResponse.content[0].text) {
        content = claudeResponse.content[0].text;
      } else {
        content = rawText;
      }
      
      console.log("Claude Content:", content.substring(0, 300) + "...");
      
      // Versuche JSON aus dem Inhalt zu extrahieren
      let jsonStr = content;
      
      // Falls der Content nicht direkt JSON ist, versuche es zu finden
      if (!content.trim().startsWith('{')) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        } else {
          throw new Error("Kein JSON gefunden");
        }
      }
      
      parsed = JSON.parse(jsonStr);
      
    } catch (parseError) {
      console.error("JSON Parse Fehler:", parseError);
      console.error("Raw content:", rawText.substring(0, 1000));
      
      // Fallback: Rohtext als Feedback anzeigen  
      return res.status(200).json({
        frameFeedback: "Debug Info:\n\n" + rawText.substring(0, 2000),
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
