// ============================================================
// INYECTOR AdMob
// Vincula anuncios automáticamente a la app generada
// SIN que el usuario toque nada
// ============================================================

import type { BuildFile } from "../types";

type AdMobConfig = {
  appId: string;
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
  banner: boolean;
  interstitial: boolean;
  rewarded: boolean;
};

const ADMOB_SCRIPT = `
<!-- AdMob by NexusAI (R3DMOON) -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3940256099942544" crossorigin="anonymous"></script>
<script>
  // AdMob auto-config by NexusAI
  window.nexusai_admob = {
    appId: "{{APP_ID}}",
    bannerId: "{{BANNER_ID}}",
    interstitialId: "{{INTERSTITIAL_ID}}",
    rewardedId: "{{REWARDED_ID}}",
    banner: {{BANNER_ENABLED}},
    interstitial: {{INTERSTITIAL_ENABLED}},
    rewarded: {{REWARDED_ENABLED}}
  };
  
  // Banner auto-insert en posición fija inferior
  function initAdMobBanner() {
    const banner = document.createElement('div');
    banner.id = 'nexusai-ad-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;z-index:9999;background:#000;text-align:center;';
    banner.innerHTML = '<ins class="adsbygoogle" style="display:inline-block;width:320px;height:50px" data-ad-client="ca-pub-3940256099942544" data-ad-slot="' + window.nexusai_admob.bannerId + '"></ins>';
    document.body.appendChild(banner);
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  }
  
  // Interstitial cada 3 navigaciones
  let navCount = 0;
  function maybeShowInterstitial() {
    navCount++;
    if (navCount % 3 === 0 && window.nexusai_admob.interstitial) {
      // En web, mostramos un interstitial simulado - en APK real se usa AdMob nativo
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99998;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = '<div style="background:#1a1a2e;padding:30px;border-radius:12px;text-align:center;color:white"><p style="margin-bottom:10px">🌟 Anuncio</p><button onclick="this.parentElement.parentElement.remove()" style="background:#7c3aed;border:none;padding:8px 20px;border-radius:6px;color:white;cursor:pointer">Cerrar</button></div>';
      document.body.appendChild(overlay);
      setTimeout(() => overlay.remove(), 5000);
    }
  }

  // Rewarded video - opcional
  function showRewardedAd() {
    if (!window.nexusai_admob.rewarded) return;
    alert('🎁 ¡Video recompensado! Ganas crédito en la app.');
    // En APK real: AdMob rewarded interstitial nativo
  }

  // Iniciar
  document.addEventListener('DOMContentLoaded', () => {
    if (window.nexusai_admob.banner) initAdMobBanner();
    // Interceptar navegaciones
    document.addEventListener('click', () => setTimeout(maybeShowInterstitial, 300));
  });
</script>
`;

export function injectAdMob(
  files: BuildFile[],
  config: AdMobConfig,
): BuildFile[] {
  return files.map((file) => {
    if (file.name === "index.html" || file.path.endsWith("index.html")) {
      let content = file.content;

      // Insert AdMob script antes del </head>
      const adMobScript = ADMOB_SCRIPT
        .replace("{{APP_ID}}", config.appId)
        .replace("{{BANNER_ID}}", config.bannerId)
        .replace("{{INTERSTITIAL_ID}}", config.interstitialId)
        .replace("{{REWARDED_ID}}", config.rewardedId)
        .replace("{{BANNER_ENABLED}}", String(config.banner))
        .replace("{{INTERSTITIAL_ENABLED}}", String(config.interstitial))
        .replace("{{REWARDED_ENABLED}}", String(config.rewarded));

      content = content.replace("</head>", `${adMobScript}\n</head>`);

      return { ...file, content, size: content.length };
    }
    return file;
  });
}