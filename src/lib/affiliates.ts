// src/lib/affiliates.ts
// Servicio de afiliados Amazon para NexusAI
// Tracking ID: r3dm01-21 (España)

const TRACKING_ID = 'r3dm01-21';
const AMAZON_BASE = 'https://www.amazon.es';

// Convierte cualquier URL Amazon en enlace de afiliado
export function affiliateUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('amazon')) {
      u.searchParams.set('tag', TRACKING_ID);
      return u.toString();
    }
  } catch {}
  return url;
}

// Genera enlace de busqueda Amazon con tag de afiliado
export function searchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `${AMAZON_BASE}/s?k=${encoded}&tag=${TRACKING_ID}`;
}

// Enlace directo a producto por ASIN
export function productUrl(asin: string): string {
  return `${AMAZON_BASE}/dp/${asin}?tag=${TRACKING_ID}`;
}

// Inyecta el tag en todos los links Amazon del DOM
export function autoAffiliateLinks(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('a[href*="amazon"]').forEach((link) => {
    const a = link as HTMLAnchorElement;
    a.href = affiliateUrl(a.href);
  });
}

// HTML de boton Amazon listo para insertar
export function amazonButton(query: string, label = 'Ver en Amazon'): string {
  const url = searchUrl(query);
  return `<a href="${url}" target="_blank" rel="nofollow sponsored" style="display:inline-flex;align-items:center;gap:8px;background:#ff9900;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">shopping_cart ${label}</a>`;
}

// Auto-aplicar al cargar
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', autoAffiliateLinks);
}
