// ============================================================
// INYECTOR freellm.net
// Conecta la app generada a la API de freellm.net
// El usuario NO necesita registrarse — usa la cuenta R3DMOON
// ============================================================

import type { BuildFile } from "../types";

type FreellmConfig = {
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
};

const FREELLM_SCRIPT = `
<!-- freellm.net IA by NexusAI (R3DMOON) -->
<script>
  window.nexusai_freellm = {
    apiKey: "{{API_KEY}}",
    baseUrl: "{{BASE_URL}}",
    enabled: {{ENABLED}}
  };

  // Chat con IA integrado
  function createAIChat(containerId, systemPrompt) {
    if (!window.nexusai_freellm.enabled) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;

    const chatHTML = `
      <div style="background:#1a1a2e;border-radius:12px;padding:15px;max-width:100%;font-family:sans-serif">
        <div id="nexusai-chat-messages" style="height:300px;overflow-y:auto;margin-bottom:10px;padding:10px;background:#0a0a0f;border-radius:8px;color:white;font-size:14px"></div>
        <div style="display:flex;gap:8px">
          <input id="nexusai-chat-input" type="text" placeholder="Pregúntale a la IA..." 
            style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid #333;background:#0a0a0f;color:white;font-size:14px" />
          <button id="nexusai-chat-send" 
            style="background:#7c3aed;color:white;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:14px">Enviar</button>
        </div>
        <p style="font-size:11px;color:#666;margin-top:8px;text-align:center">IA por freellm.net · Powered by NexusAI</p>
      </div>
    `;
    container.innerHTML = chatHTML;

    const messages = document.getElementById('nexusai-chat-messages');
    const input = document.getElementById('nexusai-chat-input');
    const sendBtn = document.getElementById('nexusai-chat-send');

    function addMessage(text, isUser) {
      const msg = document.createElement('div');
      msg.style.cssText = 'margin-bottom:8px;padding:8px 12px;border-radius:8px;max-width:80%;word-wrap:break-word';
      msg.style.background = isUser ? '#7c3aed' : '#2a2a3e';
      msg.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
      msg.style.marginLeft = isUser ? 'auto' : '0';
      msg.textContent = text;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMessage(text, true);
      addMessage('Pensando...', false);

      try {
        const response = await fetch(window.nexusai_freellm.baseUrl + '/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + window.nexusai_freellm.apiKey
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt || 'Eres un asistente útil.' },
              { role: 'user', content: text }
            ]
          })
        });
        const data = await response.json();
        // Remove "Pensando..."
        messages.removeChild(messages.lastChild);
        if (data.choices && data.choices[0]) {
          addMessage(data.choices[0].message.content, false);
        } else {
          addMessage('Lo siento, no pude procesar tu mensaje.', false);
        }
      } catch (e) {
        messages.removeChild(messages.lastChild);
        addMessage('Error de conexión. Modo offline activado.', false);
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  }

  // Función generadora (ej: títulos, descripciones, contenido)
  async function generateWithFreellm(prompt) {
    if (!window.nexusai_freellm.enabled) return 'IA no disponible';
    try {
      const response = await fetch(window.nexusai_freellm.baseUrl + '/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + window.nexusai_freellm.apiKey
        },
        body: JSON.stringify({
          model: 'text-davinci-003',
          prompt: prompt,
          max_tokens: 200
        })
      });
      const data = await response.json();
      return data.choices?.[0]?.text || 'Sin respuesta';
    } catch {
      return 'Error de conexión';
    }
  }

  window.createAIChat = createAIChat;
  window.generateWithFreellm = generateWithFreellm;
</script>
`;

export function injectFreellm(
  files: BuildFile[],
  config: FreellmConfig,
): BuildFile[] {
  return files.map((file) => {
    if (file.name === "index.html" || file.path.endsWith("index.html")) {
      let content = file.content;

      const script = FREELLM_SCRIPT
        .replace("{{API_KEY}}", config.apiKey)
        .replace("{{BASE_URL}}", config.baseUrl)
        .replace("{{ENABLED}}", String(config.enabled));

      content = content.replace("</head>", `${script}\n</head>`);

      return { ...file, content, size: content.length };
    }
    return file;
  });
}