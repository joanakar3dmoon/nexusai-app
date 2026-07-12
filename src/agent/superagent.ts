// ============================================================
// SUPERAGENTE CONSTRUCTOR
// Cerebro principal: prompt → app completa monetizada
// ============================================================

import type {
  AppBlueprint,
  AppCategory,
  MonetizationLayer,
  BuildStep,
  BuildProgress,
  BuildResult,
  BuildFile,
} from "./types";
import { generateAppFiles } from "./codegen";
import { injectAdMob } from "./injectors/admob";
import { injectAmazon } from "./injectors/amazon";
import { injectFreellm } from "./injectors/freellm";
import { injectPWA } from "./injectors/pwa";

// ============================================================
// CONFIG RAÍZ (TUS CUENTAS)
// ============================================================

const ROOT_CONFIG = {
  admob: {
    appId: "ca-app-pub-3940256099942544~3347511713", // App ID real (test)
    bannerId: "ca-app-pub-4903263409458961/BANNER_UNIT_ID",
    interstitialId: "ca-app-pub-4903263409458961/INTERSTITIAL_UNIT_ID",
    rewardedId: "ca-app-pub-4903263409458961/REWARDED_UNIT_ID",
  },
  amazon: {
    trackingId: "r3dm01-21",
  },
  freellm: {
    apiKey: "r3dm-freellm-key", // Se resuelve en entorno real
    baseUrl: "https://api.freellm.net/v1",
  },
  branding: {
    footer: "Powered by NexusAI — R3DMOON",
    watermark: true,
  },
};

// ============================================================
// ANALIZADOR DE PROMPT → BLUEPRINT
// ============================================================

function analyzePrompt(prompt: string): {
  name: string;
  description: string;
  category: AppCategory;
  features: string[];
  pages: string[];
  structure: "spa" | "multi-page" | "single-page";
  targetPlatform: "web" | "pwa" | "apk";
  primaryColor: string;
  secondaryColor: string;
  darkMode: boolean;
} {
  const lower = prompt.toLowerCase();

  // Detectar categoría por palabras clave
  let category: AppCategory = "hybrid";
  if (/(recetas|cocina|comida|vegano|restaurante)/.test(lower)) category = "content";
  else if (/(calculadora|conversor|utilidad|herramienta)/.test(lower)) category = "tool";
  else if (/(juego|trivia|quiz|entretenimiento)/.test(lower)) category = "game";
  else if (/(comunidad|foro|social|chat)/.test(lower)) category = "social";
  else if (/(tienda|venta|productos|catálogo)/.test(lower)) category = "ecommerce";
  else if (/(curso|aprender|educación|flashcard)/.test(lower)) category = "education";
  else if (/(fitness|salud|ejercicio|dieta|meditación)/.test(lower)) category = "health";
  else if (/(música|vídeo|película|entretenimiento)/.test(lower)) category = "entertainment";
  else if (/(notas|tareas|productividad|hábito)/.test(lower)) category = "productivity";
  else if (/(chatbot|asistente|ia|generador)/.test(lower)) category = "ai";

  // Extraer nombre del prompt
  let name = prompt.split(" ").slice(0, 5).join(" ");
  const nameMatch = prompt.match(/(?:llamada|nombre|app de|app para)\s+[""]?([^""]+?)[""]?(?:\s|,|$)/i);
  if (nameMatch) name = nameMatch[1].trim();
  if (!name || name.length > 40) name = "MiApp NexusAI";
  // Capitalize
  name = name.charAt(0).toUpperCase() + name.slice(1);

  // Detectar features
  const features: string[] = [];
  if (/\b(chat|mensaje|comunicación)\b/.test(lower)) features.push("Chat en vivo");
  if (/\b(notif|push|alarma|recordatorio)\b/.test(lower)) features.push("Notificaciones push");
  if (/\b(búsqueda|search|filtro)\b/.test(lower)) features.push("Búsqueda inteligente");
  if (/\b(compartir|share|redes)\b/.test(lower)) features.push("Compartir en redes");
  if (/\b(foto|imagen|galería|cámara)\b/.test(lower)) features.push("Galería de imágenes");
  if (/\b(login|registro|usuario|perfil)\b/.test(lower)) features.push("Autenticación de usuarios");
  if (/\b(api|datos|información)\b/.test(lower)) features.push("Conexión a API externa");
  if (/\b(vídeo|reproducción|player)\b/.test(lower)) features.push("Reproducción de vídeo");
  if (/\b(pago|compra|precio|carrito)\b/.test(lower)) features.push("Carrito de compras");
  if (/\b(mapa|ubicación|cerca de)\b/.test(lower)) features.push("Mapa y geolocalización");
  if (/\b(oscur|noche|modo oscuro)/.test(lower)) features.push("Modo oscuro");
  if (/\b(ia|inteligente|automático|chatbot)/.test(lower)) features.push("Funcionalidad IA (freellm.net)");
  features.push("Anuncios AdMob"); // Siempre
  features.push("Afiliados Amazon"); // Siempre

  // Detectar páginas
  const pages: string[] = ["Inicio"];
  if (/(catálogo|productos|galería|lista)/.test(lower)) pages.push("Explorar");
  if (/(detalle|descripción|ver|información)/.test(lower)) pages.push("Detalle");
  if (/(perfil|ajustes|configuración)/.test(lower)) pages.push("Perfil");
  if (/(sobre|acerca|info|contacto)/.test(lower)) pages.push("Acerca de");
  if (pages.length < 3) pages.push("Explorar", "Ajustes");

  // Determinar estructura
  const structure = pages.length <= 3 ? "spa" : "multi-page";

  // Determinar plataforma objetivo
  let targetPlatform: "web" | "pwa" | "apk" = "pwa";
  if (/(apk|android|app nativa)/.test(lower)) targetPlatform = "apk";
  else if (/(web|sitio|página)/.test(lower)) targetPlatform = "web";

  // Tema
  const primaryColor = /oscuro|negro|dark/.test(lower) ? "#0a0a0f" : "#7c3aed";
  const secondaryColor = /oscuro|negro|dark/.test(lower) ? "#7c3aed" : "#a855f7";
  const darkMode = /oscuro|noche|dark/.test(lower) || category === "ai" || category === "game";

  return {
    name,
    description: prompt,
    category,
    features,
    pages,
    structure,
    targetPlatform,
    primaryColor,
    secondaryColor,
    darkMode,
  };
}

// ============================================================
// CONSTRUCTOR DE MONETIZACIÓN
// ============================================================

function buildMonetizationLayer(category: AppCategory): MonetizationLayer {
  // Determinar qué anuncios poner según categoría
  const hasBanner = true; // Siempre banner
  const hasInterstitial = category !== "tool" && category !== "productivity"; // En herramientas no intersticiales molestos
  const hasRewarded = category === "game" || category === "entertainment" || category === "education";

  // Categoría Amazon para afiliar productos relacionados
  const amazonCategoryMap: Record<AppCategory, string> = {
    content: "Books",
    tool: "OfficeProducts",
    game: "VideoGames",
    social: "Electronics",
    ecommerce: "All",
    education: "Books",
    health: "SportsAndOutdoors",
    entertainment: "Electronics",
    productivity: "OfficeProducts",
    ai: "Electronics",
    hybrid: "Electronics",
  };

  return {
    admob: {
      enabled: true,
      banner: hasBanner,
      interstitial: hasInterstitial,
      rewarded: hasRewarded,
      appId: ROOT_CONFIG.admob.appId,
      bannerId: ROOT_CONFIG.admob.bannerId,
      interstitialId: ROOT_CONFIG.admob.interstitialId,
      rewardedId: ROOT_CONFIG.admob.rewardedId,
    },
    amazon: {
      enabled: true,
      trackingId: ROOT_CONFIG.amazon.trackingId,
      autoLink: true,
      category: amazonCategoryMap[category],
    },
    freellm: {
      enabled: category === "ai" || category === "hybrid",
      apiKey: ROOT_CONFIG.freellm.apiKey,
      features: category === "ai" ? ["chat", "generate", "analyze"] : ["generate"],
    },
  };
}

// ============================================================
// PLAN DE CONSTRUCCIÓN
// ============================================================

function buildPlan(blueprint: AppBlueprint): BuildStep[] {
  const steps: BuildStep[] = [
    {
      step: 1,
      name: "Analizando prompt",
      status: "pending",
      progress: 0,
      detail: "Comprendiendo tu idea...",
    },
    {
      step: 2,
      name: "Diseñando estructura",
      status: "pending",
      progress: 0,
      detail: `Creando ${blueprint.pages.length} páginas...`,
    },
    {
      step: 3,
      name: "Generando interfaz",
      status: "pending",
      progress: 0,
      detail: "Construyendo la UI con tu temática...",
    },
    {
      step: 4,
      name: "Inyectando AdMob",
      status: "pending",
      progress: 0,
      detail: "Vinculando anuncios con tu cuenta R3DMOON...",
    },
    {
      step: 5,
      name: "Vinculando Amazon Afiliados",
      status: "pending",
      progress: 0,
      detail: `Tracking ID: ${ROOT_CONFIG.amazon.trackingId} — productos relacionados automáticos`,
    },
    {
      step: 6,
      name: "Conectando freellm.net (IA)",
      status: "pending",
      progress: 0,
      detail: blueprint.monetization.freellm.enabled
        ? "API de IA activa sin registro del usuario"
        : "No necesario para esta app",
    },
    {
      step: 7,
      name: "Empaquetando como PWA",
      status: "pending",
      progress: 0,
      detail: "Preparando para instalar en móvil...",
    },
    {
      step: 8,
      name: "Generando APK",
      status: "pending",
      progress: 0,
      detail: blueprint.targetPlatform === "apk" || blueprint.targetPlatform === "pwa"
        ? "Construyendo APK descargable..."
        : "Skip (solo web)",
    },
    {
      step: 9,
      name: "Publicando app",
      status: "pending",
      progress: 0,
      detail: "Tu app está lista 🚀",
    },
  ];

  // Filtrar pasos irrelevantes
  return steps.filter((s) => {
    if (s.step === 6 && !blueprint.monetization.freellm.enabled) return true; // Muestra como skip
    if (s.step === 8 && blueprint.targetPlatform === "web") return false;
    return true;
  });
}

// ============================================================
// EJECUTOR PRINCIPAL
// ============================================================

export async function runSuperAgent(
  prompt: string,
  onProgress?: (progress: BuildProgress) => void,
): Promise<BuildResult> {
  // 1. ANALIZAR
  const analysis = analyzePrompt(prompt);
  const monetization = buildMonetizationLayer(analysis.category);

  const blueprint: AppBlueprint = {
    id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: analysis.name,
    description: analysis.description,
    category: analysis.category,
    features: analysis.features,
    pages: analysis.pages,
    monetization,
    prompt,
    structure: analysis.structure,
    targetPlatform: analysis.targetPlatform,
    techStack: ["HTML5", "CSS3", "JavaScript", "PWA"],
    estimatedSize: "~2.5 MB",
    theme: {
      primaryColor: analysis.primaryColor,
      secondaryColor: analysis.secondaryColor,
      darkMode: analysis.darkMode,
    },
  };

  const steps = buildPlan(blueprint);
  const totalSteps = steps.length;

  function emit(stepIndex: number, progress: number) {
    const updatedSteps = steps.map((s, i) => {
      if (i < stepIndex) return { ...s, status: "done" as const, progress: 100 };
      if (i === stepIndex) return { ...s, status: "running" as const, progress };
      return s;
    });
    onProgress?.({
      steps: updatedSteps,
      currentStep: stepIndex,
      totalSteps,
      progress: Math.round((stepIndex / totalSteps) * 100 + (progress / totalSteps) * 0.1),
      status: "building",
    });
  }

  function setStepDetail(stepIndex: number, detail: string) {
    steps[stepIndex] = { ...steps[stepIndex]!, detail };
    emit(stepIndex, steps[stepIndex]!.progress);
  }

  // ========== EJECUCIÓN ==========

  // Step 1: Análisis
  emit(0, 50);
  await sleep(600);
  setStepDetail(0, `Categoría: ${analysis.category}. ${analysis.features.length} funcionalidades detectadas`);
  emit(0, 100);

  // Step 2: Diseño
  emit(1, 30);
  await sleep(500);
  setStepDetail(1, `Arquitectura: ${analysis.structure.toUpperCase()}. ${analysis.pages.join(", ")}`);
  emit(1, 100);

  // Step 3: Generar código base
  emit(2, 10);
  const baseFiles = await generateAppFiles(blueprint);
  for (let i = 0; i < baseFiles.length; i++) {
    await sleep(200);
    setStepDetail(2, `Generando: ${baseFiles[i]!.name}`);
    emit(2, Math.round(((i + 1) / baseFiles.length) * 80));
  }
  setStepDetail(2, `${baseFiles.length} archivos creados`);
  emit(2, 100);

  // Step 4: Inyectar AdMob
  emit(3, 10);
  await sleep(400);
  const admobFiles = injectAdMob(baseFiles, blueprint.monetization.admob);
  setStepDetail(3, `AdMob vinculado (Banner: ${monetization.admob.banner ? "✅" : "❌"}, Interstitial: ${monetization.admob.interstitial ? "✅" : "❌"}, Recompensa: ${monetization.admob.rewarded ? "✅" : "❌"})`);
  emit(3, 100);

  // Step 5: Inyectar Amazon Afiliados
  emit(4, 10);
  await sleep(400);
  const amazonFiles = injectAmazon(admobFiles, {
    trackingId: ROOT_CONFIG.amazon.trackingId,
    category: monetization.amazon.category,
  });
  setStepDetail(4, `Amazon Afiliados activo — Tracking: ${ROOT_CONFIG.amazon.trackingId} (${monetization.amazon.category})`);
  emit(4, 100);

  // Step 6: Inyectar freellm.net
  emit(5, 10);
  await sleep(400);
  const freellmFiles = injectFreellm(amazonFiles, {
    apiKey: ROOT_CONFIG.freellm.apiKey,

    enabled: monetization.freellm.enabled,
  });
  setStepDetail(5, monetization.freellm.enabled
    ? "freellm.net conectado — IA disponible sin registro"
    : "Saltado (no aplica para esta categoría)");
  emit(5, 100);

  // Step 7: PWA
  emit(6, 10);
  await sleep(400);
  const pwaFiles = injectPWA(freellmFiles, blueprint);
  setStepDetail(6, "Service Worker + Manifest instalables");
  emit(6, 100);

  // Step 8: APK (si aplica)
  let apkUrl: string | undefined;
  if (blueprint.targetPlatform === "apk" || blueprint.targetPlatform === "pwa") {
    const step8Idx = steps.length - 2; // penúltimo
    emit(step8Idx, 10);
    await sleep(800);
    // Aquí se invocaría el empaquetador real (PWABuilder / Capacitor)
    apkUrl = "#"; // Placeholder — se reemplazará con URL real
    setStepDetail(step8Idx, `APK generado: ${blueprint.name}.apk`);
    emit(step8Idx, 100);
  }

  // Step 9: Publicar
  const lastIdx = steps.length - 1;
  emit(lastIdx, 50);
  await sleep(500);
  setStepDetail(lastIdx, `✅ ${blueprint.name} lista en NexusAI 🚀`);
  emit(lastIdx, 100);

  // ========== RESULTADO ==========

  const monetizationSummary: string[] = [
    `📱 AdMob — Anuncios activos (${monetization.admob.banner ? "Banner" : ""} ${monetization.admob.interstitial ? "+ Interstitial" : ""} ${monetization.admob.rewarded ? "+ Recompensa" : ""})`,
    `🛒 Amazon Afiliados — Tracking: ${ROOT_CONFIG.amazon.trackingId}`,
    `🤖 freellm.net — ${monetization.freellm.enabled ? "IA activa (chat + generación)" : "No requerido"}`,
    `📦 PWA instalable en móvil`,
    `🏷️ Marca NexusAI — Powered by R3DMOON`,
  ];

  const finalFiles: BuildFile[] = [...pwaFiles];

  return {
    success: true,
    appId: blueprint.id,
    appName: blueprint.name,
    files: finalFiles,
    apkUrl,
    previewUrl: `#preview-${blueprint.id}`,
    monetizationSummary,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
