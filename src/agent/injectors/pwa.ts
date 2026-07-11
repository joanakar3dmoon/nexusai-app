// ============================================================
// INYECTOR PWA
// Convierte la app generada en Progressive Web App instalable
// ============================================================

import type { BuildFile, AppBlueprint } from "../types";

export function injectPWA(
  files: BuildFile[],
  blueprint: AppBlueprint,
): BuildFile[] {
  const result: BuildFile[] = [...files];

  // 1. Generar manifest.json
  const manifest = {
    name: blueprint.name,
    short_name: blueprint.name.slice(0, 12),
    description: blueprint.description.slice(0, 100),
    start_url: "./index.html",
    display: "standalone",
    background_color: blueprint.theme.darkMode ? "#0a0a0f" : "#ffffff",
    theme_color: blueprint.theme.primaryColor,
    orientation: "portrait",
    icons: [
      {
        src: "./icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "./icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };

  result.push({
    name: "manifest.json",
    path: "manifest.json",
    content: JSON.stringify(manifest, null, 2),
    size: JSON.stringify(manifest).length,
  });

  // 2. Generar service worker
  const swCode = `
const CACHE_NAME = 'nexusai-${blueprint.id}-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    ))
  );
});
`;

  result.push({
    name: "sw.js",
    path: "sw.js",
    content: swCode,
    size: swCode.length,
  });

  // 3. Añadir etiquetas PWA al index.html
  const updatedFiles = result.map((file) => {
    if (file.name === "index.html" || file.path.endsWith("index.html")) {
      let content = file.content;

      // Añadir meta theme-color si no existe
      if (!content.includes('name="theme-color"')) {
        content = content.replace(
          "</title>",
          `</title>\n    <meta name="theme-color" content="${blueprint.theme.primaryColor}" />`,
        );
      }

      // Añadir meta apple-mobile-web-app
      if (!content.includes("apple-mobile-web-app-capable")) {
        content = content.replace(
          "</title>",
          `</title>\n    <meta name="apple-mobile-web-app-capable" content="yes" />`,
        );
      }

      // Registrar service worker
      if (!content.includes("serviceWorker")) {
        content = content.replace(
          "</body>",
          `<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js');
    });
  }
</script>
</body>`,
        );
      }

      return { ...file, content, size: content.length };
    }
    return file;
  });

  return updatedFiles;
}