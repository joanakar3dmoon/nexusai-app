// ============================================================
// INYECTOR GROQ IA — NexusAI by R3DMOON
// Modelos reales y gratuitos via Groq API
// API Key: no caduca
// ============================================================

import type { BuildFile } from "../types";

type GroqConfig = {
  apiKey: string;
  enabled: boolean;
};

const GROQ_SCRIPT = `
<!-- NexusAI IA by R3DMOON — Groq Free API -->
<script>
(function() {
  const GROQ_KEY = "{{API_KEY}}";
  const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

  const MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b"
  ];

  async function callGroq(messages, modelIndex = 0) {
    if (modelIndex >= MODELS.length) return null;
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + GROQ_KEY
        },
        body: JSON.stringify({
          model: MODELS[modelIndex],
          messages: messages,
          max_tokens: 500,
          temperature: 0.7
        })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch(e) {
      return callGroq(messages, modelIndex + 1);
    }
  }

  window.createAIChat = function(containerId, systemPrompt) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const sp = systemPrompt || "Eres un asistente util y amigable. Responde siempre en el idioma del usuario.";
    container.innerHTML = '<div style="background:#1a1a2e;border-radius:12px;padding:15px;font-family:sans-serif"><div style="display:flex;align-items:center;margin-bottom:10px;gap:8px"><span style="background:#7c3aed;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:bold">NexusAI</span></div><div id="nexusai-msgs" style="height:280px;overflow-y:auto;padding:10px;background:#0a0a0f;border-radius:8px;color:white;font-size:14px"></div><div style="display:flex;gap:8px;margin-top:10px"><input id="nexusai-input" type="text" placeholder="Escribe tu pregunta..." style="flex:1;padding:10px;border-radius:8px;border:1px solid #333;background:#0a0a0f;color:white;font-size:14px"/><button id="nexusai-send" style="background:#7c3aed;color:white;border:none;border-radius:8px;padding:10px 16px;cursor:pointer">Send</button></div></div>';
    const msgs = document.getElementById("nexusai-msgs");
    const input = document.getElementById("nexusai-input");
    const sendBtn = document.getElementById("nexusai-send");
    const history = [{ role: "system", content: sp }];
    function addMsg(role, text) {
      const div = document.createElement("div");
      div.style.cssText = "margin-bottom:10px;padding:8px 12px;border-radius:8px;" + (role === "user" ? "background:#1e1b4b;color:#c4b5fd" : "background:#0f172a;color:#e2e8f0");
      div.textContent = (role === "assistant" ? "AI: " : "Tu: ") + text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }
    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendBtn.disabled = true;
      addMsg("user", text);
      history.push({ role: "user", content: text });
      const reply = await callGroq(history);
      if (reply) { history.push({ role: "assistant", content: reply }); addMsg("assistant", reply); }
      else addMsg("assistant", "Error de conexion. Intentalo de nuevo.");
      sendBtn.disabled = false;
    }
    sendBtn.addEventListener("click", send);
    input.addEventListener("keypress", function(e) { if (e.key === "Enter") send(); });
  };

  window.generateWithAI = async function(prompt, systemPrompt) {
    const sp = systemPrompt || "Eres un asistente creativo. Responde de forma concisa.";
    return await callGroq([{ role: "system", content: sp }, { role: "user", content: prompt }]) || "IA no disponible";
  };

  window.generateWithFreellm = window.generateWithAI;
  window.nexusai_groq = { enabled: true, models: MODELS };
  console.log("NexusAI Groq IA cargada");
})();
</script>
`;

export function injectFreellm(
  files: BuildFile[],
  config: GroqConfig,
): BuildFile[] {
  return files.map((file) => {
    if (file.name === "index.html" || file.path.endsWith("index.html")) {
      let content = file.content;
      const script = GROQ_SCRIPT.replace("{{API_KEY}}", config.apiKey);
      content = content.replace("</head>", script + "\n</head>");
      return { ...file, content, size: content.length };
    }
    return file;
  });
}
