// ============================================================
// GENERADOR DE CÓDIGO
// Traduce el blueprint en archivos HTML/CSS/JS reales
// ============================================================

import type { AppBlueprint, BuildFile } from "./types";

export async function generateAppFiles(blueprint: AppBlueprint): Promise<BuildFile[]> {
  const files: BuildFile[] = [];

  // ============ index.html ============
  const html = generateHTML(blueprint);
  files.push({ name: "index.html", path: "index.html", content: html, size: html.length });

  // ============ styles.css ============
  const css = generateCSS(blueprint);
  files.push({ name: "styles.css", path: "styles.css", content: css, size: css.length });

  // ============ app.js ============
  const js = generateJS(blueprint);
  files.push({ name: "app.js", path: "app.js", content: js, size: js.length });

  return files;
}

function generateHTML(blueprint: AppBlueprint): string {
  const { name, description, pages, theme, features } = blueprint;
  const darkClass = theme.darkMode ? "dark" : "";

  const navItems = pages
    .map(
      (page, i) =>
        `<a href="#" class="nav-link ${i === 0 ? "active" : ""}" data-page="${i}">${page}</a>`,
    )
    .join("\n          ");

  const featureCards = features
    .slice(0, 6)
    .map(
      (f) =>
        `<div class="feature-card"><span class="feature-icon">✦</span><span>${f}</span></div>`,
    )
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="es" class="${darkClass}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${name}</title>
  <meta name="description" content="${escapeHTML(description.slice(0, 160))}" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <!-- NexusAI Watermark -->
  <div class="nexusai-badge">⚡ NexusAI · R3DMOON</div>

  <!-- Header -->
  <header class="app-header">
    <button id="menuBtn" class="icon-btn">☰</button>
    <h1 class="app-title">${name}</h1>
    <button id="settingsBtn" class="icon-btn">⚙</button>
  </header>

  <!-- Navigation -->
  <nav class="app-nav">
    ${navItems}
  </nav>

  <!-- Content Area -->
  <main id="appContent" class="app-content">
    <div class="welcome-section">
      <h2>${name}</h2>
      <p>${escapeHTML(description.slice(0, 120))}</p>
    </div>
    <div class="features-grid">
      ${featureCards}
    </div>
    <!-- Amazon auto-affiliate container -->
    <div data-amazon="${blueprint.monetization.amazon.category}"></div>
    <!-- AI Chat container (si aplica) -->
    ${blueprint.monetization.freellm.enabled ? '<div id="aiChatContainer" class="ai-chat-container"></div>' : ""}
  </main>

  <!-- Bottom AdMob space (inyectado automáticamente) -->

  <script src="app.js"></script>
</body>
</html>`;
}

function generateCSS(blueprint: AppBlueprint): string {
  const { theme } = blueprint;
  const bg = theme.darkMode ? "#0a0a0f" : "#f8f9fa";
  const cardBg = theme.darkMode ? "#1a1a2e" : "#ffffff";
  const textColor = theme.darkMode ? "#ffffff" : "#1a1a2e";
  const mutedText = theme.darkMode ? "#888" : "#666";

  return `/* NexusAI Generated — ${blueprint.name} */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: ${bg};
  color: ${textColor};
  padding-bottom: 60px;
  min-height: 100vh;
}

.nexusai-badge {
  position: fixed; top: 8px; right: 8px; z-index: 9999;
  background: ${theme.primaryColor}; color: white;
  font-size: 10px; padding: 3px 8px; border-radius: 4px;
  opacity: 0.7; pointer-events: none;
}

.app-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: ${cardBg};
  border-bottom: 1px solid ${theme.darkMode ? "#2a2a3e" : "#e0e0e0"};
  position: sticky; top: 0; z-index: 100;
}
.app-title { font-size: 18px; font-weight: 700; }
.icon-btn {
  background: none; border: none; color: ${textColor};
  font-size: 22px; cursor: pointer; width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
}
.icon-btn:hover { background: ${theme.darkMode ? "#2a2a3e" : "#f0f0f0"}; }

.app-nav {
  display: flex; overflow-x: auto; gap: 4px;
  padding: 8px 12px; background: ${cardBg};
  border-bottom: 1px solid ${theme.darkMode ? "#2a2a3e" : "#e0e0e0"};
}
.nav-link {
  flex-shrink: 0; padding: 6px 14px; border-radius: 20px;
  font-size: 13px; text-decoration: none; color: ${mutedText};
  background: ${theme.darkMode ? "#12121f" : "#f0f0f0"};
  transition: all 0.2s;
}
.nav-link.active { background: ${theme.primaryColor}; color: white; }

.app-content {
  padding: 16px; max-width: 600px; margin: 0 auto;
}

.welcome-section { margin-bottom: 20px; text-align: center; }
.welcome-section h2 { font-size: 22px; margin-bottom: 8px; }
.welcome-section p { color: ${mutedText}; font-size: 14px; line-height: 1.5; }

.features-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;
}
.feature-card {
  background: ${cardBg}; padding: 12px; border-radius: 10px;
  border: 1px solid ${theme.darkMode ? "#2a2a3e" : "#e8e8e8"};
  text-align: center; font-size: 13px;
}
.feature-icon { display: block; font-size: 24px; margin-bottom: 4px; }

.ai-chat-container { margin-top: 16px; }

/* Responsive */
@media (max-width: 380px) {
  .features-grid { grid-template-columns: 1fr; }
}`;
}

function generateJS(blueprint: AppBlueprint): string {
  return `// NexusAI Generated — ${blueprint.name}
(function() {
  'use strict';

  // Navegación entre páginas
  const pages = ${JSON.stringify(blueprint.pages)};
  let currentPage = 0;

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const pageIndex = parseInt(this.dataset.page);
      navigateTo(pageIndex);
    });
  });

  function navigateTo(index) {
    currentPage = index;
    document.querySelectorAll('.nav-link').forEach((l, i) => {
      l.classList.toggle('active', i === index);
    });
    document.getElementById('appContent').innerHTML = '<div class="welcome-section"><h2>' + pages[index] + '</h2><p>Contenido cargado desde NexusAI</p></div>';
    // Trigger Amazon re-linking
    if (window.autoAmazonify) window.autoAmazonify();
    if (window.injectAmazonProducts) window.injectAmazonProducts();
  }

  // Menú móvil
  document.getElementById('menuBtn')?.addEventListener('click', () => {
    alert('Menú próximamente');
  });

  // Settings
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('nexusai-dark', dark);
  });

  // Restaurar preferencia dark mode
  if (localStorage.getItem('nexusai-dark') === 'true') {
    document.documentElement.classList.add('dark');
  }

  // Inicializar AI Chat si existe
  ${blueprint.monetization.freellm.enabled ? `
  setTimeout(() => {
    const container = document.getElementById('aiChatContainer');
    if (container && window.createAIChat) {
      window.createAIChat('aiChatContainer', 'Eres un asistente para ${blueprint.name}. Responde de forma útil y concisa.');
    }
  }, 500);` : ""}

  // Log
  console.log('${blueprint.name} — Powered by NexusAI (R3DMOON)');
})();`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}