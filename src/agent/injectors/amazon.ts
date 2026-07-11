// ============================================================
// INYECTOR Amazon Afiliados
// Vincula enlaces de afiliados Amazon automáticamente
// Tracking ID: r3dm01-21 (R3DMOON)
// ============================================================

import type { BuildFile } from "../types";

type AmazonConfig = {
  trackingId: string;
  category: string;
};

const AMAZON_SCRIPT = `
<!-- Amazon Afiliados by NexusAI (R3DMOON) -->
<script>
  window.nexusai_amazon = {
    trackingId: "{{TRACKING_ID}}",
    category: "{{CATEGORY}}"
  };

  // Convierte cualquier enlace a Amazon en enlace de afiliado
  function autoAmazonify() {
    document.querySelectorAll('a[href*="amazon"]').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('tag', window.nexusai_amazon.trackingId);
      link.href = url.toString();
    });
  }

  // Genera enlace de producto aleatorio para la categoría
  function getAmazonLink(productName) {
    const search = encodeURIComponent(productName || window.nexusai_amazon.category);
    return 'https://www.amazon.es/s?k=' + search + '&tag=' + window.nexusai_amazon.trackingId;
  }

  // Inserta cards de productos sugeridos en contenedores con data-amazon
  function injectAmazonProducts() {
    document.querySelectorAll('[data-amazon]').forEach(el => {
      const query = el.getAttribute('data-amazon') || window.nexusai_amazon.category;
      const amazonLink = getAmazonLink(query);
      el.innerHTML = '<div style="background:linear-gradient(135deg,#232f3e,#131921);border-radius:8px;padding:15px;margin:10px 0;color:white;text-align:center">' +
        '<p style="font-size:14px;margin-bottom:8px;opacity:0.9">🛒 Compra en Amazon</p>' +
        '<a href="' + amazonLink + '" target="_blank" rel="nofollow" style="display:inline-block;background:#ff9900;color:#000;padding:8px 20px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">' +
        'Ver en Amazon →</a>' +
        '<p style="font-size:11px;margin-top:8px;opacity:0.6">Como afiliado, R3DMOON recibe una comisión</p></div>';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    autoAmazonify();
    injectAmazonProducts();
    // Re-aplicar cuando cambie el contenido dinámico
    const observer = new MutationObserver(() => {
      autoAmazonify();
      injectAmazonProducts();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
</script>
`;

export function injectAmazon(
  files: BuildFile[],
  config: AmazonConfig,
): BuildFile[] {
  return files.map((file) => {
    if (file.name === "index.html" || file.path.endsWith("index.html")) {
      let content = file.content;

      const amazonScript = AMAZON_SCRIPT
        .replace("{{TRACKING_ID}}", config.trackingId)
        .replace("{{CATEGORY}}", config.category);

      content = content.replace("</head>", `${amazonScript}\n</head>`);

      return { ...file, content, size: content.length };
    }
    return file;
  });
}