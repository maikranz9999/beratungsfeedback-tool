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

Für jede Anforderung erstellst du eine farbige Box:
- GRÜN (✅): Anforderung voll erfüllt
- GELB (⚠️): Anforderung erfüllt, aber verbesserungsfähig  
- ROT (❌): Anforderung nicht oder nur teilweise erfüllt

STRUKTUR für jede Box:
1. Anforderung (immer gleiche Bezeichnung)
2. Status-Bewertung mit Begründung
3. Konkrete Zitate aus dem Text als Belege
4. Bei Gelb/Rot: Spezifische Verbesserungsvorschläge mit Positiv-Beispielen

Die 8 Anforderungen:

1. **Länge: 500-800 Wörter** 
   - Grün: 500-800 Wörter
   - Gelb: 400-499 oder 801-900 Wörter  
   - Rot: unter 400 oder über 900 Wörter

2. **Storytelling statt oberflächlicher Aufzählung**
   - Grün: 1-3 detaillierte Stories mit klaren Situationsbeschreibungen
   - Gelb: Stories vorhanden, aber noch zu oberflächlich
   - Rot: Nur Aufzählungen ohne echte Stories

3. **Keine chronologische Erzählung des Werdegangs**
   - Grün: Spezifische Momente/Situationen werden herausgepickt
   - Gelb: Teilweise chronologisch, aber auch spezifische Momente
   - Rot: Rein chronologische Abarbeitung des Werdegangs

4. **Begründung der Expertise mit Experten-Merkmalen**
   - Experten-Merkmale: Klare Meinung, selbstbewusstes Sprechen, Gamechanger-Strategien, Status Quo hinterfragen, gegen den Strom schwimmen
   - Grün: Mehrere Experten-Merkmale klar erkennbar
   - Gelb: Einige Experten-Merkmale vorhanden
   - Rot: Kaum echte Experten-Merkmale erkennbar

5. **Natürlicher Gesprächston (gesprochenes Wort)**
   - Grün: Klingt wie natürliche Unterhaltung
   - Gelb: Überwiegend natürlich, aber teilweise zu geschrieben
   - Rot: Zu geleckt/geschrieben, nicht wie gesprochenes Wort

6. **Integration negativer Erfahrungen/Learnings**
   - Grün: Negative Erfahrungen werden als Lernmomente genutzt
   - Gelb: Negative Aspekte erwähnt, aber Lerneffekt nicht klar
   - Rot: Keine negativen Erfahrungen/Learnings erwähnt

7. **Professionelle Tonalität ohne Romantisierung**
   - Grün: Professionell ohne Fanatismus oder Romantisierung
   - Gelb: Überwiegend professionell, aber teilweise zu niedlich/fanatisch
   - Rot: Zu romantisiert oder fanatisch ("schon als kleines Mädchen...")

8. **Keine überflüssigen Frames oder Ankündigungen**
   - Grün: Direkter Einstieg in Stories ohne Ankündigungen
   - Gelb: Wenige überflüssige Frames
   - Rot: Viele Ankündigungen wie "ich werde mal etwas ausholen"

Das Feedback soll als HTML-formatierter String zurückgegeben werden mit farbigen Boxen.
`;

  const systemMsg = `Du bist ein Bewertungsassistent für Hochzeitsdienstleister-Beratungen. 
Erstelle detailliertes, strukturiertes Feedback in HTML-Format mit farbigen Boxen für jede Anforderung.
Antworte immer als strikt gültiges JSON ohne zusätzlichen Text außerhalb des JSON-Objekts.

${evaluationCriteria}`;

  const userMsg = `
Bewerte den folgenden Experten-Frame detailliert nach den 8 Anforderungen.

Erstelle für jede Anforderung eine farbige HTML-Box mit:
1. Anforderungs-Titel
2. Status-Bewertung (✅ Grün / ⚠️ Gelb / ❌ Rot)  
3. Konkrete Zitate aus dem Text als Belege
4. Bei Gelb/Rot: Spezifische Verbesserungsvorschläge

🧠 Experten-Frame:
${frame}

${!onlyFrame ? `🛠 Methode:
${methode}

💬 Beratung:
${beratung}` : ''}

onlyFrame=${onlyFrame}

Gib das Feedback als HTML-String in JSON zurück:
{
  "frameFeedback": "<div class='feedback-container'>HTML mit 8 farbigen Boxen für jede Anforderung</div>",
  "methodeFeedback": "...",
  "beratungFeedback": "..."
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
