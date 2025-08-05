function switchTab(tab) {
  const buttons = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  buttons.forEach(btn => btn.classList.remove('active'));
  contents.forEach(cont => cont.classList.remove('active'));
  document.querySelector(`.tab-button[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(tab + 'Tab').classList.add('active');
}

function updateWordCount(id) {
  const text = document.getElementById(id).value;
  const words = text.trim().split(/\s+/).filter(Boolean);
  document.getElementById(id + 'WordCount').innerText = `Wörter: ${words.length}`;
}

async function getFeedback() {
  const payload = {
    frame: document.getElementById("frame").value,
    methode: document.getElementById("methode").value,
    beratung: document.getElementById("beratung").value,
    onlyFrame: document.getElementById("onlyFrame").checked
  };

  const response = await fetch("http://localhost:3000/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  document.getElementById("frameFeedback").innerText = result.frameFeedback || "Keine Rückmeldung.";
  document.getElementById("methodeFeedback").innerText = result.methodeFeedback || "Keine Rückmeldung.";
  document.getElementById("beratungFeedback").innerText = result.beratungFeedback || "Keine Rückmeldung.";
}
